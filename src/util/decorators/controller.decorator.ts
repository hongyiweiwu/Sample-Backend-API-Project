import { RouteOptions } from "fastify/types/route";
import { Http2SecureServer } from "http2";
import { join } from "path";
import { Injectable } from './injectable.decorator';
import { Newable } from "../service/discovery.service";

/**
 * Marks a class as a controller. The decorator will scan through the methods in the class and registers all methods decorated with `Route` into
 * Fastify's router.
 */
export const Controller = (route: string) => <T>(constructor: Newable<T>) => {
    const routes: RouteOptions<Http2SecureServer>[] = [];

    Object.getOwnPropertyNames(constructor.prototype).forEach((property) => {
        const method = Object.getOwnPropertyDescriptor(constructor.prototype, property)?.value!;
        const routeOptions: Omit<RouteOptions<Http2SecureServer>, "handler"> = Reflect.getMetadata("routeOptions", method);
        if (routeOptions) {
            routeOptions.url = join(route, routeOptions.url);
            routes.push({ ...routeOptions, handler: method });
        }
    })

    Reflect.defineMetadata("routes", routes, constructor);

    return Injectable(constructor, ["Controller"])(constructor);
};