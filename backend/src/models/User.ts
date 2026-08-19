import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
    walletAddress: string;
    username: string;
    role: 'Admin' | 'Manufacturer' | 'Certifier' | 'Distributor' | 'Retailer';
}

const userSchema = new Schema<IUser>({
    walletAddress: { type: String, required: true, unique: true, lowercase: true },
    username: { type: String, required: true },
    role: {
        type: String,
        enum: ['Admin', 'Manufacturer', 'Certifier', 'Distributor', 'Retailer'],
        required: true
    }
}, { timestamps: true });

export const User = model<IUser>('User', userSchema);