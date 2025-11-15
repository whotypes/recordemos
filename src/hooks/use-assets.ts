import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";

export function useAssets(projectId?: Id<"projects">) {
    const assets = useQuery(
        api.assets.listByProject,
        projectId ? { projectId } : "skip"
    );

    return assets ?? [];
}

export function useAsset(assetId?: Id<"assets">) {
    const asset = useQuery(
        api.assets.getAsset,
        assetId ? { assetId } : "skip"
    );

    return asset;
}

export function useVideoUrl(objectKey?: string) {
    const url = useQuery(
        api.assets.getVideoUrl,
        objectKey ? { objectKey } : "skip"
    );

    return url;
}

export function useDeleteAsset() {
    const deleteAsset = useMutation(api.assets.deleteAsset);

    return async (assetId: Id<"assets">) => {
        await deleteAsset({ assetId });
    };
}
