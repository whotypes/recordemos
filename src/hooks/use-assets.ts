import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "convex/_generated/api";

export function useAssetUpload() {
    const uploadFile = useUploadFile(api.assets);

    return async function upload(file: File) {
        const key = await uploadFile(file);
        return key; // asset row already created!
    };
}

