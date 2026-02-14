import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent, DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { ProductVariant } from '../entities/product-variant.entity';
import { Product } from '../product.entity';

@EventSubscriber()
@Injectable()
export class ProductVariantSubscriber implements EntitySubscriberInterface<ProductVariant> {

    constructor(dataSource: DataSource) {
        dataSource.subscribers.push(this);
    }

    listenTo() {
        return ProductVariant;
    }

    // 1. Run after a new variant is created
    async afterInsert(event: InsertEvent<ProductVariant>) {
        await this.syncStock(event.entity.productId, event.manager);
    }

    // 2. Run after a variant is updated (e.g., stock changed)
    async afterUpdate(event: UpdateEvent<ProductVariant>) {
        // We check both previous and current ID just in case the product link changed
        const productId = event.entity?.productId || event.databaseEntity?.productId;
        await this.syncStock(productId, event.manager);
    }

    // 3. Run after a variant is deleted
    async afterRemove(event: RemoveEvent<ProductVariant>) {
        const productId = event.entity?.productId || event.databaseEntity?.productId;
        await this.syncStock(productId, event.manager);
    }

    // --- LOGIC: Calculate Sum and Update Parent ---
    private async syncStock(productId: number, manager: any) {
        if (!productId) return;

        // A. Sum the stock of all variants for this product
        const { total } = await manager
            .getRepository(ProductVariant)
            .createQueryBuilder('variant')
            .select('SUM(variant.stock)', 'total')
            .where('variant.productId = :id', { id: productId })
            .getRawOne();

        const newStock = total ? parseInt(total, 10) : 0;

        // B. Get Distinct Colors (Optional: keeps colors list updated too)
        const variants = await manager.find(ProductVariant, { where: { productId } });
        const uniqueColors = [...new Set(variants.map((v: ProductVariant) => v.color))];

        // C. Update the Parent Product
        await manager.update(Product, productId, {
            stock: newStock,
            colors: uniqueColors
        });

        console.log(`🔄 Auto-Synced Product #${productId}: Stock = ${newStock}`);
    }
}