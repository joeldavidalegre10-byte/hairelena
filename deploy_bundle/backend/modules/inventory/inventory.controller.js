import { InventoryService } from './inventory.service.js';
export class InventoryController {
    static async listCategories(_req, res, next) {
        try {
            const data = await InventoryService.listCategories();
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async listServices(req, res, next) {
        try {
            let data = await InventoryService.listServices();
            // Si el usuario es cajero, ocultar porcentajes de ganancia, costos y configuración de margen
            if (req.user?.role === 'cashier') {
                data = data.map((srv) => {
                    const { profit_margin_percent, cost, custom_margin_active, ...clean } = srv;
                    return clean;
                });
            }
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async createService(req, res, next) {
        try {
            const data = await InventoryService.createService(req.body);
            res.status(201).json({ success: true, message: 'Servicio creado', data });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateService(req, res, next) {
        try {
            const data = await InventoryService.updateService(req.params.id, req.body);
            res.json({ success: true, message: 'Servicio actualizado', data });
        }
        catch (error) {
            next(error);
        }
    }
    static async listProducts(req, res, next) {
        try {
            let data = await InventoryService.listProducts();
            // Si el usuario es cajero, ocultar el precio de costo del producto
            if (req.user?.role === 'cashier') {
                data = data.map((prd) => {
                    const { cost_price, ...clean } = prd;
                    return clean;
                });
            }
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async createProduct(req, res, next) {
        try {
            const data = await InventoryService.createProduct(req.body);
            res.status(201).json({ success: true, message: 'Producto registrado', data });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateProduct(req, res, next) {
        try {
            const data = await InventoryService.updateProduct(req.params.id, req.body);
            res.json({ success: true, message: 'Producto actualizado', data });
        }
        catch (error) {
            next(error);
        }
    }
    static async adjustStock(req, res, next) {
        try {
            const adjustment = Number(req.body.adjustment) || 0;
            const data = await InventoryService.adjustStock(req.params.id, adjustment);
            res.json({ success: true, message: 'Stock actualizado', data });
        }
        catch (error) {
            next(error);
        }
    }
}
