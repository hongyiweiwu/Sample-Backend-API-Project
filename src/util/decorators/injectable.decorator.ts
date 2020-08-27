import { InjectionToken, Newable, Provider } from "../service/discovery.service";
import { InjectionMetadataKey } from "./inject.decorator";

export const ProviderMetadataKey = Symbol("DI:Provider");

export interface ProviderMetadata<T> {
    token: InjectionToken<T>;
    provider: Provider<T>;
    tags: string[];
}

export const Injectable = <T>(token?: InjectionToken<T>, tags?: string[], asyncInitializer?: (target: T) => Promise<void>, shutdownHook?: (target: T) => void | Promise<void>) => (target: Newable<T>) => {
    const provider: ProviderMetadata<T> = { token: token ?? target, tags: tags ?? [], provider: { useClass: target, afterResolution: asyncInitializer, shutdownHook } };
    Reflect.defineMetadata(ProviderMetadataKey, provider, target);
};