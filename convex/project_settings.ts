import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("project_settings")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .first()

    return settings ?? null
  },
})

export const initialize = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("project_settings")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .first()

    if (existing) {
      return existing._id
    }

    return await ctx.db.insert("project_settings", {
      projectId: args.projectId,
      // frame/canvas settings
      aspectRatio: "16:9",
      zoomLevel: 100,
      hideToolbars: false,
      // background settings
      backgroundColor: "#1a1a1a",
      backgroundType: "gradient",
      gradientAngle: 170,
      // video transform settings
      scale: 1,
      translateX: 0,
      translateY: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      perspective: 2000,
      // browser frame settings
      frameHeight: "small",
      showSearchBar: false,
      showStroke: true,
      macOsDarkColor: "#1a1a1a",
      macOsLightColor: "#f4f4f4",
      arcDarkMode: false,
      hideButtons: false,
      hasButtonColor: true,
      selectedFrame: "None",
      frameRoundness: 0.4,
      searchBarText: "",
    })
  },
})

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    // frame/canvas settings
    aspectRatio: v.optional(v.string()),
    zoomLevel: v.optional(v.number()),
    hideToolbars: v.optional(v.boolean()),
    // background settings
    backgroundColor: v.optional(v.string()),
    backgroundType: v.optional(v.string()),
    gradientAngle: v.optional(v.number()),
    // video transform settings
    scale: v.optional(v.number()),
    translateX: v.optional(v.number()),
    translateY: v.optional(v.number()),
    rotateX: v.optional(v.number()),
    rotateY: v.optional(v.number()),
    rotateZ: v.optional(v.number()),
    perspective: v.optional(v.number()),
    // browser frame settings
    frameHeight: v.optional(v.string()),
    showSearchBar: v.optional(v.boolean()),
    showStroke: v.optional(v.boolean()),
    macOsDarkColor: v.optional(v.string()),
    macOsLightColor: v.optional(v.string()),
    arcDarkMode: v.optional(v.boolean()),
    hideButtons: v.optional(v.boolean()),
    hasButtonColor: v.optional(v.boolean()),
    selectedFrame: v.optional(v.string()),
    frameRoundness: v.optional(v.number()),
    searchBarText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("project_settings")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .first()

    if (!settings) {
      // initialize with defaults if not exists
      return await ctx.db.insert("project_settings", {
        projectId: args.projectId,
        aspectRatio: args.aspectRatio ?? "16:9",
        zoomLevel: args.zoomLevel ?? 100,
        hideToolbars: args.hideToolbars ?? false,
        backgroundColor: args.backgroundColor ?? "#1a1a1a",
        backgroundType: args.backgroundType ?? "gradient",
        gradientAngle: args.gradientAngle ?? 170,
        scale: args.scale ?? 1,
        translateX: args.translateX ?? 0,
        translateY: args.translateY ?? 0,
        rotateX: args.rotateX ?? 0,
        rotateY: args.rotateY ?? 0,
        rotateZ: args.rotateZ ?? 0,
        perspective: args.perspective ?? 2000,
        frameHeight: args.frameHeight ?? "small",
        showSearchBar: args.showSearchBar ?? false,
        showStroke: args.showStroke ?? true,
        macOsDarkColor: args.macOsDarkColor ?? "#1a1a1a",
        macOsLightColor: args.macOsLightColor ?? "#f4f4f4",
        arcDarkMode: args.arcDarkMode ?? false,
        hideButtons: args.hideButtons ?? false,
        hasButtonColor: args.hasButtonColor ?? true,
        selectedFrame: args.selectedFrame ?? "None",
        frameRoundness: args.frameRoundness ?? 0.4,
        searchBarText: args.searchBarText ?? "",
      })
    }

    // build patches object with only defined values
    const patches: Record<string, string | number | boolean> = {}

    if (args.aspectRatio !== undefined) patches.aspectRatio = args.aspectRatio
    if (args.zoomLevel !== undefined) patches.zoomLevel = args.zoomLevel
    if (args.hideToolbars !== undefined) patches.hideToolbars = args.hideToolbars
    if (args.backgroundColor !== undefined) patches.backgroundColor = args.backgroundColor
    if (args.backgroundType !== undefined) patches.backgroundType = args.backgroundType
    if (args.gradientAngle !== undefined) patches.gradientAngle = args.gradientAngle
    if (args.scale !== undefined) patches.scale = args.scale
    if (args.translateX !== undefined) patches.translateX = args.translateX
    if (args.translateY !== undefined) patches.translateY = args.translateY
    if (args.rotateX !== undefined) patches.rotateX = args.rotateX
    if (args.rotateY !== undefined) patches.rotateY = args.rotateY
    if (args.rotateZ !== undefined) patches.rotateZ = args.rotateZ
    if (args.perspective !== undefined) patches.perspective = args.perspective
    if (args.frameHeight !== undefined) patches.frameHeight = args.frameHeight
    if (args.showSearchBar !== undefined) patches.showSearchBar = args.showSearchBar
    if (args.showStroke !== undefined) patches.showStroke = args.showStroke
    if (args.macOsDarkColor !== undefined) patches.macOsDarkColor = args.macOsDarkColor
    if (args.macOsLightColor !== undefined) patches.macOsLightColor = args.macOsLightColor
    if (args.arcDarkMode !== undefined) patches.arcDarkMode = args.arcDarkMode
    if (args.hideButtons !== undefined) patches.hideButtons = args.hideButtons
    if (args.hasButtonColor !== undefined) patches.hasButtonColor = args.hasButtonColor
    if (args.selectedFrame !== undefined) patches.selectedFrame = args.selectedFrame
    if (args.frameRoundness !== undefined) patches.frameRoundness = args.frameRoundness
    if (args.searchBarText !== undefined) patches.searchBarText = args.searchBarText

    if (Object.keys(patches).length > 0) {
      await ctx.db.patch(settings._id, patches)
    }

    return settings._id
  },
})
