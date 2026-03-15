import { inject, Injectable } from '@angular/core'
import type { IManagedObject, IResultList, QueryObjectRoot } from '@c8y/client'
import { InventoryService } from '@c8y/client'
import type { GlobeWidgetDeviceTarget } from '../globe-widget.model'

const INVENTORY_PAGE_SIZE = 200
const INVENTORY_QUERY_BATCH_SIZE = 50

interface C8yPosition {
  lat: number
  lng: number
}

export type PositionedManagedObject = IManagedObject & {
  c8y_Position: C8yPosition
}

export interface ResolvedRealtimeSources {
  withPosition: PositionedManagedObject[]
  withoutPosition: IManagedObject[]
}

function chunkValues<T>(values: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize))
  }

  return chunks
}

function dedupeManagedObjects(managedObjects: IManagedObject[]): IManagedObject[] {
  const uniqueManagedObjects = new Map<string, IManagedObject>()

  for (const managedObject of managedObjects) {
    uniqueManagedObjects.set(managedObject.id, managedObject)
  }

  return [...uniqueManagedObjects.values()]
}

function hasValidPosition(managedObject: IManagedObject): managedObject is PositionedManagedObject {
  const position = managedObject['c8y_Position'] as Partial<C8yPosition> | undefined

  return typeof position?.lat === 'number'
    && Number.isFinite(position.lat)
    && typeof position.lng === 'number'
    && Number.isFinite(position.lng)
}

function isDeviceTarget(target: GlobeWidgetDeviceTarget | undefined): target is GlobeWidgetDeviceTarget {
  return Boolean(target?.c8y_IsDevice)
}

@Injectable({ providedIn: 'root' })
export class GlobeWidgetSourcesService {
  private readonly inventory = inject(InventoryService)

  async resolveSources(target: GlobeWidgetDeviceTarget | undefined): Promise<ResolvedRealtimeSources> {
    if (!target) {
      return {
        withPosition: [],
        withoutPosition: [],
      }
    }

    const targetIds = isDeviceTarget(target)
      ? [target.id]
      : await this.loadHierarchyTargetIds(target)

    const managedObjects = await this.loadManagedObjectsByIds(targetIds)
    const withPosition: PositionedManagedObject[] = []
    const withoutPosition: IManagedObject[] = []

    for (const managedObject of managedObjects) {
      if (hasValidPosition(managedObject)) {
        withPosition.push(managedObject)
        continue
      }

      withoutPosition.push(managedObject)
    }

    return {
      withPosition,
      withoutPosition,
    }
  }

  private async loadHierarchyTargetIds(target: GlobeWidgetDeviceTarget): Promise<string[]> {
    const query: QueryObjectRoot = target.c8y_IsDynamicGroup
      ? { __bygroupid: target.id }
      : { __isinhierarchyof: target.id }

    const hierarchyTargets = await this.listManagedObjects(query)

    return [...new Set(
      hierarchyTargets
        .map(({ id }) => id)
        .filter((id) => id !== target.id),
    )]
  }

  private async listManagedObjects(query: QueryObjectRoot): Promise<IManagedObject[]> {
    const firstPage = await this.inventory.listQuery(query, {
      pageSize: INVENTORY_PAGE_SIZE,
      withTotalPages: true,
    })

    return this.collectPagedResults(firstPage)
  }

  private async loadManagedObjectsByIds(ids: string[]): Promise<IManagedObject[]> {
    const uniqueIds = [...new Set(ids.filter(Boolean))]

    if (uniqueIds.length === 0) {
      return []
    }

    const managedObjectGroups = await Promise.all(
      chunkValues(uniqueIds, INVENTORY_QUERY_BATCH_SIZE)
        .map((chunk) => this.listManagedObjects({ id: { __in: chunk } })),
    )

    return dedupeManagedObjects(managedObjectGroups.flat())
  }

  private async collectPagedResults(result: IResultList<IManagedObject>): Promise<IManagedObject[]> {
    const managedObjects = [...result.data]
    let currentPage = result
    const visitedPages = new Set<number>()

    if (typeof currentPage.paging?.currentPage === 'number') {
      visitedPages.add(currentPage.paging.currentPage)
    }

    while (currentPage.paging?.nextPage) {
      const nextPageNumber = currentPage.paging.nextPage

      if (visitedPages.has(nextPageNumber)) {
        break
      }

      visitedPages.add(nextPageNumber)

      const nextPage = await currentPage.paging.next()

      if (nextPage.data.length === 0) {
        break
      }

      managedObjects.push(...nextPage.data)
      currentPage = nextPage
    }

    return managedObjects
  }
}
