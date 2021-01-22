import { Request, Response } from "express";
import knex from "../database/connection";

interface Item {
    id: number;
    title: string;
    image: string;
}

// const baseURL = "http://localhost:3333";
const baseURL = "http://192.168.100.2:3333";

class ItemsController {
    index = async (request: Request, response: Response) => {
        async function selectAllItems() {
            const items: Item[] = await knex("items").select("*");

            return items;
        }

        async function formatItems(itemsToFormat: Item[]) {
            const itemsFormatted = itemsToFormat.map((item: Item) => {
                return {
                    id: item.id,
                    title: item.title,
                    image_url: `${baseURL}/uploads/${item.image}`,
                };
            });

            return itemsFormatted;
        }

        const items: Item[] = await selectAllItems();

        const serializedItems = await formatItems(items);

        return response.json(serializedItems);
    };
}

export default ItemsController;
