import { FastifyReply, FastifyRequest } from "fastify";
import { Controller } from "../util/decorators/controller.decorator";
import { Route } from "../util/decorators/route.decorator";
import { NewImageBodyPayload, GetImageQueryPayload } from "./image.interface";
import { Inject } from "../util/decorators/inject.decorator";
import { ImageService } from "./image.service";
import { UserService } from "../user/user.service";
import formidable = require("formidable");
import { promises as fs } from 'fs';
import { createAssertEquals } from "typescript-is";

@Controller("/image")
export class ImageController {
    @Inject(ImageService) readonly imageService!: ImageService;

    @Route({
        method: "GET",
        url: "",
        preHandler: UserService.verifyJwtToken,
        schema: { querystring: {} },
        validatorCompiler: _ => {
            const validator = createAssertEquals<GetImageQueryPayload>();
            return (body: any) => {
                try {
                    validator(body);
                    return { value: body };
                } catch (e) {
                    return { error: e };
                }
            };
        }, 
    })
    async getImage(req: FastifyRequest<{ Querystring: GetImageQueryPayload }>, res: FastifyReply) {
        return this.imageService.getPictures(req.query.id, req.headers.authorization!);
    }

    @Route({
        method: "POST",
        url: "/upload",
        preHandler: UserService.verifyJwtToken,
    })
    async uploadImage(req: FastifyRequest<{ Body: NewImageBodyPayload  }>, res: FastifyReply) {
        let isPublic: boolean | undefined = undefined;
        const files: Record<string, Buffer> = {};

        const form = new formidable.IncomingForm();

        await new Promise(resolve => {
            form.parse(req.raw, async (err, fields, parsedFiles) => {
                isPublic = fields.isPublic === "true" ? true : fields.isPublic === "false" ? false : undefined;

                for (const [filename, file] of Object.entries(parsedFiles)) {
                    const buffer = await fs.readFile(file.path);
                    if (files[filename]) {
                        res.badRequest(`More than one image with name ${filename} is given.`);
                        return;
                    }

                    files[filename] = buffer;
                }

                resolve();
            });
        });

        if (isPublic === undefined) {
            res.badRequest(`Missing mandatory field isPublic in body of request.`);
            return;
        }

        return await this.imageService.savePictures(files, isPublic, req.headers.authorization!);
    }
}