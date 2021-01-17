import { string } from "@hapi/joi";
import { Request, Response } from "express";
import Knex from "knex";
import knex from "../database/connection";

interface Point {
    image: string;
    name: string;
    email: string;
    whatsapp: string;
    latitude: number;
    longitude: number;
    city: string;
    uf: string;
}

const baseURL = "http://localhost:3333";
// const baseURL = "http://192.168.100.2:3333";

class PointsController {
    serializePoint = async (point: Point) => {
        return {
            ...point,
            image_url: `${baseURL}/uploads/${point.image}`,
        };
    };

    serializePoints = async (points: Point[]) => {
        const serialized = points.map((point: Point) =>
            this.serializePoint(point)
        );
        return serialized;
    };

    async index(request: Request, response: Response) {
        interface PointIndexQueryFilters {
            city: string;
            uf: string;
            items: string;
            itemsParsed: number[];
        }

        async function parseItems(items: string) {
            const itemsParsed = items
                .split(",")
                .map((item) => Number(item.trim()));

            return itemsParsed;
        }

        async function selectPointsFiltered(
            indexQueryFilters: PointIndexQueryFilters
        ) {
            const filtered = knex("points")
                .join("point_items", "points.id", "=", "point_items.point_id")
                .whereIn("point_items.item_id", indexQueryFilters.itemsParsed)
                .where("city", String(indexQueryFilters.city))
                .where("uf", String(indexQueryFilters.uf))
                .distinct()
                .select("points.*");
            return filtered;
        }

        const indexQueryFilters: PointIndexQueryFilters = <any>request.query;

        indexQueryFilters.itemsParsed = await parseItems(
            indexQueryFilters.items
        );

        const pointsFiltered = await selectPointsFiltered(indexQueryFilters);

        const serializedPoints = await this.serializePoints(pointsFiltered);

        const indexResponse = response.json(serializedPoints);

        return indexResponse;
    }

    show = async (request: Request, response: Response) => {
        async function getPointIdFromRequest({ params }: { params: any }) {
            return Number(params.id);
        }

        async function selectPointUsingId(id: number) {
            return knex("points").where("id", id).first();
        }

        const id: number = await getPointIdFromRequest(request);
        const point: Point = await selectPointUsingId(id);

        if (point) {
            const serializedPoint = await this.serializePoint(point);
            const items = await knex("items")
                .join("point_items", "items.id", "=", "point_items.item_id")
                .where("point_items.point_id", id)
                .select("items.title");

            return response.json({ point: serializedPoint, items });
        }

        return response.status(400).json({ message: "Point not found." });
    };

    create = async (request: Request, response: Response) => {
        async function startTransaction() {
            return await knex.transaction();
        }

        async function transactionInsertPoint(
            trx: Knex.Transaction,
            point: Point
        ) {
            return await trx("points").insert(point);
        }

        async function createPointItemsArray(
            point_id: number,
            items: number[]
        ) {
            const pointItemsArray = items.map((item_id: number) => {
                return {
                    item_id,
                    point_id,
                };
            });

            return pointItemsArray;
        }

        async function stringToNumberArray(stringToConvert: string) {
            return stringToConvert
                .split(",")
                .map((element: string) => Number(element.trim()));
        }

        async function transactionInsertPointItems(
            trx: Knex.Transaction,
            pointItems: { item_id: number; point_id: number }[]
        ) {
            return await trx("point_items").insert(pointItems);
        }

        async function transactionCommit(trx: Knex.Transaction) {
            return await trx.commit();
        }

        const {
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
            items,
        } = request.body;

        const itemsAsNumberArray: number[] = await stringToNumberArray(items);

        const trx = await startTransaction();

        const point: Point = {
            image: request.file.filename,
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
        };

        const insertedIds = await transactionInsertPoint(trx, point);

        const point_id = insertedIds[0];

        const pointItems = await createPointItemsArray(
            point_id,
            itemsAsNumberArray
        );

        await transactionInsertPointItems(trx, pointItems);

        await transactionCommit(trx);

        return response.json({
            id: point_id,
            ...point,
        });
    };
}

export default PointsController;
