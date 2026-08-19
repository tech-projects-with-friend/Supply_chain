import { Schema, model, Document } from 'mongoose';

export interface IProductMeta extends Document {
    productId: string;
    description: string;
    imageUrl: string;
    additionalNotes: string;
}

const productMetaSchema = new Schema<IProductMeta>({
    productId: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    additionalNotes: { type: String }
}, { timestamps: true });

export const ProductMeta = model<IProductMeta>('ProductMeta', productMetaSchema);
