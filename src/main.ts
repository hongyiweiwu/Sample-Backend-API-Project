import loggerFactory from 'debug';
import fastify, { RouteOptions } from 'fastify';
import compress from 'fastify-compress';
import cors from 'fastify-cors';
import favicon from 'fastify-favicon';
import helmet from 'fastify-helmet';
import rateLimit from 'fastify-rate-limit';
import sensible from 'fastify-sensible';
import "reflect-metadata";
import { DiscoveryService } from './util/service/discovery.service';

async function main() {
    const instance = fastify({
        trustProxy: true,
    });

    instance.register(cors);
    instance.register(helmet);
    instance.register(compress);
    instance.register(favicon);
    instance.register(rateLimit);
    // instance.register(multiPart, { attachFieldsToBody: true, prefix: "/image/upload" });
    instance.register(sensible);

    instance.addContentTypeParser("multipart/form-data", (request, payload, done) => {
        done(null, payload);
    });

    const discoveryService = new DiscoveryService();
    const logger = loggerFactory("main");
    discoveryService.register("Logger", { useValue: logger });
    discoveryService.register("Fastify", { useValue: instance });
    await discoveryService.discover();
    await discoveryService.initialize();

    // Discover & setup all routes and providers.
    discoveryService.getByTag("Controller").forEach(controller => {
        const routes: RouteOptions[] = Reflect.getMetadata("routes", controller.constructor);
        routes.forEach(route => {
            console.log(route.method, route.url);
            instance.route({
                ...route,
                handler: (req, res) => controller[route.handler.name](req, res),
            });
        })
    });

    logger("Initialization complete.");

    const shutdown = async () => {
        await instance.close();
        await discoveryService.shutdown();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    await instance.listen(3000);

}

main();