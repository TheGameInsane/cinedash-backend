import mongoose, { Schema, Document } from 'mongoose';

export interface IWatchHistory {
  id: number;
  type: string;
  title: string;
  poster: string;
  genre:[number];
  rating: number; 
  watchedAt: Date;
}

export interface IWatchlistItem {
  id: number;
  media_type: string; 
}

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  dateOfBirth?: Date;
  googleId?: string;
  profileComplete: boolean;
  favoriteGenres: number[]; 
  watchHistory: IWatchHistory[];
  watchlist: IWatchlistItem[]; 
}

const WatchHistorySchema = new Schema<IWatchHistory>({
  id: { type: Number, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  poster: { type: String, required: true },
  genre: [{ type: Number }],
  rating: { type: Number, required: true, min: 1, max: 10 },
  watchedAt: { type: Date, default: Date.now }
});

const WatchlistItemSchema = new Schema<IWatchlistItem>({
  id: { type: Number, required: true },
  media_type: { type: String, required: true, enum: ['movie', 'tv'] },
}, { _id: false });

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  dateOfBirth: { type: Date },
  googleId: { type: String, sparse: true },
  profileComplete: { type: Boolean, default: false },
  favoriteGenres: [{ type: Number }],
  watchHistory: [WatchHistorySchema],
  watchlist: [WatchlistItemSchema]
}, { timestamps: true });

export const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);