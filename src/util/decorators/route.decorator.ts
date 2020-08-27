import { RouteOptions } from "fastify";
import { Http2SecureServer } from "http2";

/**
 * Marks a method in a controller as a route handler.
 */
export const Route = (options: Omit<RouteOptions, "handler">) => (classInstance: any, name: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('routeOptions', options, descriptor.value);
}