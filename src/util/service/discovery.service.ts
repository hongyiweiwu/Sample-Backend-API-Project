import { Debugger } from "debug";
import glob from 'fast-glob';
import { join } from "path";
import { InjectionMetadataKey } from "../decorators/inject.decorator";
import { ProviderMetadata, ProviderMetadataKey } from '../decorators/injectable.decorator';

export type Newable<T = unknown> = { new (...args: any[]): T };
export type InjectionToken<T = unknown> = string | symbol | Newable<T>;

export interface ValueProvider<T> {
    useValue: T;
}

export interface ClassProvider<T> {
    useClass: Newable<T>;
    afterResolution?: (target: T) => Promise<void>;
    shutdownHook?: (target: T) => void | Promise<void>;
}

export type Provider<T = unknown> = ValueProvider<T> | ClassProvider<T>;

export interface InjectableDescriptor<T> {
    token: InjectionToken<T>;
}

export class DiscoveryService {
    private readonly providerGlobs = [
        "src/**/*.controller.ts",
        "src/**/*.service.ts",
    ];

    private providerMaps = new Map<InjectionToken, [Provider, string[]]>();
    private container = new Map<InjectionToken, unknown>();
    
    private isShutdown = false;

    private isValueProvider<T>(provider: Provider<T>): provider is ValueProvider<T> {
        return "useValue" in provider;
    }

    private isClassProvider<T>(provider: Provider<T>): provider is ClassProvider<T> {
        return "useClass" in provider;
    }

    constructor() {
        this.register(DiscoveryService, { useValue: this });
    }

    register<T>(token: InjectionToken<T>, provider: Provider<T>, ...tags: string[]) {
        this.providerMaps.set(token, [provider as Provider<unknown>, tags]);
    }

    get<T>(token: InjectionToken<T>): T | undefined {
        return this.container.get(token) as T | undefined;
    }

    getByTag(tag: string): any[] {
        const tokenWithTags = Array.from(this.providerMaps.keys()).filter(key => {
            return this.providerMaps.get(key)![1].includes(tag);
        });
        
        return tokenWithTags.map(token => this.container.get(token));
    }

    async initialize() {
        const resolve = async <T>(token: InjectionToken<T>, provider: Provider<T>) => {
            if (this.container.has(token)) {
                return;
            }
            
            if (records.get(token)) {
                throw new Error("Error in dependency injection: There is a circular dependency.");
            }

            records.set(token, true);

            if (this.isValueProvider(provider)) {
                this.container.set(token, provider.useValue);
                if (this.get("Logger")) {
                    this.get<Debugger>("Logger")!(`Resolved ${String(token)}`);
                }
            } else {
                const dependencies = dependencyMap.get(token)!;

                for (const dependency of Object.values(dependencies)) {
                    if (!this.providerMaps.has(dependency)) {
                        throw new Error("Error in dependency injection: Trying to inject something that is not provided.");
                    }
                    const [provider] = this.providerMaps.get(dependency)!;
                    await resolve(dependency, provider);
                }

                const newObject: T = Reflect.construct(provider.useClass, []);
                for (const [key, dependency] of Object.entries(dependencies)) {
                    Reflect.set(newObject as any, key, this.container.get(dependency)!);
                }

                this.container.set(token, newObject);
                if (provider.afterResolution) {
                    await provider.afterResolution(newObject);
                }

                if (this.get("Logger")) {
                    this.get<Debugger>("Logger")!(`Resolved ${provider.useClass.name}`);
                }
            }
        }

        const records = new Map(Array.from(this.providerMaps).map<[InjectionToken, boolean]>(([token]) => [token, false]));
        const dependencyMap = new Map(Array.from(this.providerMaps).map<[InjectionToken, Record<string, InjectionToken>]>(([token, [provider]]) => {
            if (this.isClassProvider(provider)) {
                const metadata: Record<string, InjectionToken> | undefined = Reflect.getMetadata(InjectionMetadataKey, provider.useClass.prototype);
                return [token, metadata ?? {}];
            } else {
                return [token, {}];
            }
        }));

        for (const [token, [provider]] of this.providerMaps.entries()) {
            if (records.get(token)) {
                continue;
            }

            await resolve(token, provider);
        }
    }

    /**
     * Discovers all injectables and binds them to the container. Also blocks until all async initializers declared for each dependency is executed.
     */
    async discover() {
        await Promise.all(glob.sync(this.providerGlobs).map(async provider => {
            const providerFileName = provider.split("src")[1].split(".ts")[0];
            if (__filename.includes(providerFileName)) {
                return;
            }
            const exports: Record<string, unknown> = await import(join(process.cwd(), "dist", providerFileName));

            Object.values(exports).forEach(elem => {
                const providerMetadata: ProviderMetadata<unknown> | undefined = Reflect.getMetadata(ProviderMetadataKey, elem as any);
                if (!providerMetadata) {
                    return;
                }

                if (this.providerMaps.has(providerMetadata.token)) {
                    throw new Error("Error in dependency injection: two elements with the same token are injected.");
                }
                this.providerMaps.set(providerMetadata.token, [providerMetadata.provider, providerMetadata.tags]);
            })
        }));
    }

    /**
     * Invoke the shutdown hooks of all providers.
     */
    async shutdown() {
        if (this.isShutdown) {
            return;
        }

        this.isShutdown = true;
        return Promise.all(Array.from(this.providerMaps.values()).map(async ([provider]) => {
            if (this.isClassProvider(provider) && provider.shutdownHook) {
                return await provider.shutdownHook(this.container.get(provider.useClass));
            }
        }));
    }
}