import {Subscription} from "../models/subscription";
import {EntityRepository, FindManyOptions, Repository} from "typeorm";
import {flatten, groupBy, map, merge} from "lodash";

@EntityRepository(Subscription)
export class SubscriptionRepository extends Repository<Subscription> {
    public async findWithRelations(
        relations: Array<keyof Subscription> = [],
        optionsWithoutRelations: Omit<FindManyOptions<Subscription>, "relations"> = {}
    ): Promise<Subscription[]> {
        const entities = await this.find(optionsWithoutRelations)
        const entitiesIds = entities.map(({ id }) => id)

        const groupedRelations = {}
        for (const rel of relations) {
            const [topLevel] = rel.split(".")
            if (groupedRelations[topLevel]) {
                groupedRelations[topLevel].push(rel)
            } else {
                groupedRelations[topLevel] = [rel]
            }
        }

        const entitiesIdsWithRelations = await Promise.all(
            Object.entries(groupedRelations).map(([_, rels]) => {
                return this.findByIds(entitiesIds, {
                    select: ["id"],
                    relations: rels as string[],
                })
            })
        ).then(flatten)
        const entitiesAndRelations = entitiesIdsWithRelations.concat(entities)

        const entitiesAndRelationsById = groupBy(entitiesAndRelations, "id")
        return map(entitiesAndRelationsById, (entityAndRelations) =>
            merge({}, ...entityAndRelations)
        )
    }

    public async findOneWithRelations(
        relations: Array<keyof Subscription> = [],
        optionsWithoutRelations: Omit<FindManyOptions<Subscription>, "relations"> = {}
    ): Promise<Subscription> {
        // Limit 1
        optionsWithoutRelations.take = 1

        const result = await this.findWithRelations(
            relations,
            optionsWithoutRelations
        )
        return result[0]
    }
}