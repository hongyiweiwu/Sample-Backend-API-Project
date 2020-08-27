import { Injectable } from "../util/decorators/injectable.decorator";
import { join } from "path";
import { Inject } from "../util/decorators/inject.decorator";
import { Debugger } from "debug";
import { FastifyInstance } from 'fastify';
import { Image } from "./image.interface";
import { promises as fs } from 'fs';
import { assertEquals } from "typescript-is";
import { v4 } from 'uuid';

@Injectable(ImageService, [], imageService => imageService.initialize(), imageService => imageService.shutdown())
export class ImageService {
    @Inject("Logger") readonly logger!: Debugger;
    @Inject("Fastify") readonly fastify!: FastifyInstance;

    /**
     * Location of the images
     * 
     * In an real app this would be read in from a config file. The images themselves would be stored on some on-premise or on cloud
     * storage solutions.
     */
    static readonly imageDataLocation = join(process.cwd(), "data/images");

    /**
     * Location of the image metadata file. 
     * 
     * In an real app this would be read in from a config file.
     */
    static readonly imageMetadataLocation = join(process.cwd(), "data/images.json")

    /**
     * Stores all users using this app. A map of their (globally unique) username to their info. 
     * 
     * In a real app instead of storing everything in memory we will query through a database. The index will be on the database-provided unique id and not the username.
     * But for now this suffices.
     */ 
    images: Map<string, Image> = new Map();

    shutdown() {
        return fs.writeFile(ImageService.imageMetadataLocation, JSON.stringify(Array.from(this.images.values())));
    }

    async initialize() {
        try {
            const data: Image[] = JSON.parse(await fs.readFile(ImageService.imageMetadataLocation, 'utf-8'));
            assertEquals<Image[]>(data);
            data.forEach(image => {
                this.images.set(image.id, image);
            })
        } catch (e) {
            this.logger(`Local user data at ${ImageService.imageDataLocation} is corrupted. All data is now cleared.`);
            try {
                await fs.unlink(ImageService.imageDataLocation);
            } catch (e) {}
            this.images.clear();
            return;
        }
    }

    savePictures(pictures: Record<string, Buffer>, isPublic: boolean, username: string) {
        return Promise.all<string>(Object.entries(pictures).map(([name, image]) => new Promise(async resolve => {
            const id = v4();
            await fs.writeFile(join(ImageService.imageDataLocation, id), image);
            this.images.set(id, {
                name,
                id,
                isPublic,
                username,
            });
            resolve(id);
        })));
    }

    async getPictures(id: string, userId: string) {
        const metadata = this.images.get(id);

        if (!metadata) {
            throw this.fastify.httpErrors.notFound("No image with this id found.");
        } else if (!metadata.isPublic && metadata.username !== userId) {
            throw this.fastify.httpErrors.forbidden("You can't access this private image of another user.");
        } else {
            return fs.readFile(join(ImageService.imageDataLocation, metadata.id));
        }
    }
}