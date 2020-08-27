import { FastifyRequest } from "fastify";
import { createAssertEquals, assertEquals } from 'typescript-is';
import { Controller } from "../util/decorators/controller.decorator";
import { Inject } from "../util/decorators/inject.decorator";
import { Route } from "../util/decorators/route.decorator";
import { LoginPayload, RegisterPayload } from "./user.interface";
import { UserService } from "./user.service";

@Controller("/user")
export class UserController {
    @Inject(UserService) readonly userService!: UserService;

    @Route({
        method: 'POST',
        url: "/new",
        schema: { body: {} },
        validatorCompiler: _ => {
            const validator = createAssertEquals<RegisterPayload>();
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
    newUser(req: FastifyRequest<{Body: RegisterPayload}>) {
        return this.userService.register(req.body.username, req.body.password, req.body.name);
    }

    @Route({
        method: "POST",
        url: "/login",
        schema: { body: {} },
        validatorCompiler: _ => {
            const validator = createAssertEquals<LoginPayload>();
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
    login(req: FastifyRequest<{Body: LoginPayload}>) {
        return this.userService.login(req.body.username, req.body.password);
    }

    @Route({
        method: "GET",
        url: "/",
        preHandler: UserService.verifyJwtToken,
    })   
    getUser(req: FastifyRequest) {
        return {
            ...this.userService.getUser(req.headers.authorization!),
            hashPassword: "<redacted>",
        };
    }
}