const CACHING_ENABLED = false

const DB_NAME = "recorddemos"
const STORE_NAME = "projects"
const CACHE_KEY = "projects_cache"
const CACHE_VERSION = 1

interface CachedProjects {
	projects: Array<{
		_id: string
		name: string
		createdAt: number
		updatedAt: number
	}>
	timestamp: number
	version: number
}

let db: IDBDatabase | null = null

async function initDB(): Promise<IDBDatabase> {
	if (db) return db

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, CACHE_VERSION)

		request.onerror = () => reject(request.error)
		request.onsuccess = () => {
			db = request.result
			resolve(db)
		}

		request.onupgradeneeded = (event) => {
			const database = (event.target as IDBOpenDBRequest).result
			if (!database.objectStoreNames.contains(STORE_NAME)) {
				database.createObjectStore(STORE_NAME)
			}
		}
	})
}

export async function getCachedProjects(): Promise<CachedProjects["projects"] | null> {
	if (!CACHING_ENABLED) return null

	try {
		const database = await initDB()
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAME], "readonly")
			const store = transaction.objectStore(STORE_NAME)
			const request = store.get(CACHE_KEY)

			request.onerror = () => reject(request.error)
			request.onsuccess = () => {
				const cached = request.result as CachedProjects | undefined
				if (cached && cached.version === CACHE_VERSION) {
					const age = Date.now() - cached.timestamp
					const maxAge = 5 * 60 * 1000
					if (age < maxAge) {
						resolve(cached.projects)
					} else {
						resolve(null)
					}
				} else {
					resolve(null)
				}
			}
		})
	} catch (error) {
		console.error("Failed to get cached projects:", error)
		return null
	}
}

export async function setCachedProjects(
	projects: CachedProjects["projects"],
): Promise<void> {
	if (!CACHING_ENABLED) return

	try {
		const database = await initDB()
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAME], "readwrite")
			const store = transaction.objectStore(STORE_NAME)
			const cached: CachedProjects = {
				projects,
				timestamp: Date.now(),
				version: CACHE_VERSION,
			}
			const request = store.put(cached, CACHE_KEY)

			request.onerror = () => reject(request.error)
			request.onsuccess = () => resolve()
		})
	} catch (error) {
		console.error("Failed to cache projects:", error)
	}
}

export async function clearCachedProjects(): Promise<void> {
	if (!CACHING_ENABLED) return

	try {
		const database = await initDB()
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAME], "readwrite")
			const store = transaction.objectStore(STORE_NAME)
			const request = store.delete(CACHE_KEY)

			request.onerror = () => reject(request.error)
			request.onsuccess = () => resolve()
		})
	} catch (error) {
		console.error("Failed to clear cached projects:", error)
	}
}
