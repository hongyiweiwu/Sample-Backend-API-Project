import { InjectionToken } from "../service/discovery.service"

export const InjectionMetadataKey = Symbol("DI:InjectionToken");

export const Inject = <T>(token: InjectionToken<T>) => (target: any, propertyKey: string) => {
    const inspectedProperties: Record<string, InjectionToken> = Reflect.hasMetadata(InjectionMetadataKey, target) ? Reflect.getMetadata(InjectionMetadataKey, target) : {};
    inspectedProperties[propertyKey] = token;
    Reflect.defineMetadata(InjectionMetadataKey, inspectedProperties, target);
}