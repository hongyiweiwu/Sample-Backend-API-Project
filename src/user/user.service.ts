import { compare, hash } from 'bcrypt';
import { Debugger } from "debug";
import { FastifyInstance, FastifyReply, FastifyRequest, HookHandlerDoneFunction } from "fastify";
import createError from "fastify-error";
import { promises as fs } from 'fs';
import { StatusCodes } from "http-status-codes";
import { sign, verify } from 'jsonwebtoken';
import { join } from "path";
import { assertEquals } from "typescript-is";
import { Inject } from "../util/decorators/inject.decorator";
import { Injectable } from "../util/decorators/injectable.decorator";
import { User } from "./user.interface";

@Injectable(UserService, [], userService => userService.initialize(), userService => userService.shutdown())
export class UserService {
    @Inject("Logger") readonly logger!: Debugger;
    @Inject("Fastify") readonly fastify!: FastifyInstance;

    /**
     * Location of the user data file. 
     * 
     * In an real app this would be read in from a config file.
     */
    static readonly userDataLocation = join(process.cwd(), "data/users.json");

    /**
     * Number of round a password is hashed before being stored in the database.
     */
    static readonly passwordHashRound = 10;

    /**
     * Secret for the JWT encryption.
     */
    static readonly jsonWebTokenSecret = "ShopifyRocks";

    static verifyJwtToken(req: FastifyRequest, res: FastifyReply, done: HookHandlerDoneFunction) {
        // Strips out the token.
        const token = req.headers.authorization;
        if (!token) {
            done(createError("REQUEST_ERROR", "No authorization token provided.", StatusCodes.UNAUTHORIZED));
            return;
        } 

        try {
            const username = verify(token, UserService.jsonWebTokenSecret);
            if (typeof username !== "string") {
                done(createError("REQUEST_ERROR", "Invalid token.", StatusCodes.UNAUTHORIZED));
                return;
            }

            req.headers.authorization = username;
            done();
        } catch (e) {
            done(createError("REQUEST_ERROR", "Invalid token.", StatusCodes.UNAUTHORIZED));
        }
    }

    /**
     * Stores all users using this app. A map of their (globally unique) username to their info. 
     * 
     * In a real app instead of storing everything in memory we will query through a database. The index will be on the database-provided unique id and not the username.
     * But for now this suffices.
     */ 
    users: Map<string, User> = new Map();

    shutdown() {
        return fs.writeFile(UserService.userDataLocation, JSON.stringify(Array.from(this.users.values())));
    }

    async initialize() {
        try {
            const data: User[] = JSON.parse(await fs.readFile(UserService.userDataLocation, 'utf-8'));
            assertEquals<User[]>(data);
            data.forEach(user => {
                this.users.set(user.username, user);
            })
        } catch (e) {
            this.logger(`Local user data at ${UserService.userDataLocation} is corrupted. All data is now cleared.`);
            try {
                await fs.unlink(UserService.userDataLocation);
            } catch (e) {}
            this.users.clear();
            return;
        }
    }

    /**
     * Registers a new user. Returns the JWT token identifying the user. Throws a 
     */
    async register(username: string, password: string, name: string) {
        // Complete the async step first so checking whether user exists & adding the user is atomic.
        const newUser: User = {
            username,
            name,
            hashPassword: await hash(password, UserService.passwordHashRound),
        };
        
        if (this.users.has(username)) {
            throw this.fastify.httpErrors.conflict("A user with the same username already exists.");
        }
        
        this.users.set(username, newUser);
        return sign(username, UserService.jsonWebTokenSecret);
    }

    /**
     * Logins for an existing user. Returns the json web token used to identify the user.
     */
    async login(username: string, password: string) {
        if (!this.users.has(username)) {
            throw this.fastify.httpErrors.notFound("There's no user associated with the given username.");
        } else if (!await compare(password, this.users.get(username)!.hashPassword)) {
            throw this.fastify.httpErrors.unauthorized("Wrong password.");
        }

        console.log(this.users);

        return sign(username, UserService.jsonWebTokenSecret);
    }

    getUser(username: string) {
        console.log(username);
        if (!this.users.has(username)) {
            throw this.fastify.httpErrors.notFound("There's no user associated with the given username.");
        }

        return this.users.get(username)!;
    }
}