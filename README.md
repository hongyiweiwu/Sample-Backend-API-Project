# Sample Backend API Project

This is a sample backend API simulating a photo repository. It's written in `node` and `TypeScript`. As it currently stands the app doesn't require any additional services except for `node` itself.

## How to Run
Clone this repo, do `npm run install`, `npm run build`, then `npm run start`.

## More Details about What's in Here?
The backend API currently supports the following features:
* User registration/login with `bcrypt`-ed password protection.
* Image upload/retrieval. Supports access control (an image can be made public or private; if private only the user who uploaded it can retrieve it.)
* A mini dependency injection framework, defined in `util/decorators` and `util/service/discovery.service.ts`, which automatically discovers all components(controllers, services) in the repo, analyze the dependency relationships, and initialize them.

To make this app easily runnable without additional softwares required, I didn't connect this to a database or an online storage solution. So the metadata for images and user information is stored in-memory, although after the server receives a termination signal it will write the info to `data/images.json` and `data/users.json`, so when the server is fired up the next time it can read in these information,s imulating a semi-persistent storage. Similarly, the images themselves are stored in `data/images`, identified by a unique ID allocated by the server.

## API References
* `POST /user/new` Create a new user.

The endpoint takes in the following payload:
```typescript
{
    /* Username for this user. Each user needs to have an unique username. */
    username: string;
    /* Password for this user. Required to log in later. This is safe because the password will be `bcrypted` before entering the database. */
    password: string;
    /* Name of the user. */
    name: string;
}
```

| Status Code | Meaning | Response Body | 
| ----------- | ------- | ------------- |
| 201 | Registration is successful | A JWT token that must be attached in the `authorization` header for later requests for authentication. |
| 409 | Another user with the same username exists. | |
| 400 | The payload is malformed. ||
| 500 | Unknown server error. ||

* `POST /user/login` Logs in.

The endpoint takes in the following payload:
```typescript
{
    /* Username for this user. Each user needs to have an unique username. */
    username: string;
    /* Password for this user. Required to log in later. This is safe because the password will be `bcrypted` before entering the database. */
    password: string;
}
```

| Status Code | Meaning | Response Body | 
| ----------- | ------- | ------------- |
| 201 | Login is successful | A JWT token that must be attached in the `authorization` header for later requests for authentication. |
| 404 | No user with the given username is found. | |
| 401 | Password is incorrect. ||
| 400 | The payload is malformed. ||
| 500 | Unknown server error. ||

* `GET /user` Retrieves user information.
This endpoint requires the `authorization` field in header to be filled with a previously-issued JWT token.

| Status Code | Meaning | Response Body | 
| ----------- | ------- | ------------- |
| 200 | User found. | A JSON object including information about the user. Looks identical to the payload for the `POST /user/new` endpoint. |
| 401 | Invalid JWT token. ||
| 500 | Unknown server error. ||

* `POST /image/upload` Uploads new images.
This endpoint requires the `authorization` field in header to be filled with a previously-issued JWT token.

This endpoint takes in a body that must be in the `multipart/formdata` format with the following fields:
```typescript
{
    // Whether the images attached to this payload should be public or not.
    isPublic: string;
    // Each of the remaining properties will be identified as an image to be uploaded. The property name will be the key and the value will be a byte-encoded string of the image.
    [imageName: string]: string
}
```

| Status Code | Meaning | Response Body | 
| ----------- | ------- | ------------- |
| 201 | Upload is successful | An array of strings that are IDs corresponding to the images just uploaded. |
| 401 | Invalid JWT token. ||
| 400 | Errors with the payload, including but not limited to missing `isPublic` field, multiple fields with the same name, etc. ||
| 500 | Unknown server error. ||

* `GET /image` Get images.
This endpoint takes in a query property `id=<id>` where `id` is the id of the image we're trying to fetch.

| Status Code | Meaning | Response Body | 
| ----------- | ------- | ------------- |
| 200 | Retrieval success. | The requested image. |
| 401 | Invalid JWT token. ||
| 404 | No image with the given ID is found. ||
| 403 | Trying to access the private image of another user. ||
| 400 | Errors with the payload, including but not limited to missing `isPublic` field, multiple fields with the same name, etc. ||
| 500 | Unknown server error. ||
