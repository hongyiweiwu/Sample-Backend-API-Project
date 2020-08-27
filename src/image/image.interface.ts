export interface Image {
    name: string;
    username: string;
    isPublic: boolean;
    /**
     * Unique ID that identifies this image in the file system.
     */
    id: string;
}

export interface NewImageBodyPayload {
    isPublic: string;
    [elements: string]: any;
}

export interface GetImageQueryPayload {
    id: string;
}