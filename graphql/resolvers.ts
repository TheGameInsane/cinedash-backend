import { User } from '../models/User.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import { OAuth2Client } from 'google-auth-library';
import { Response } from 'express';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

interface Context {
  userId: string | undefined;
  res: Response;
}

export const resolvers = {
  Query: {
    me: async (_: any, __: any, context: Context) => {
      if (!context.userId) return null;
      return await User.findById(context.userId);
    },
    getUser: async (_: any, { id }: { id: string }) => {
      return await User.findById(id);
    },
    getUsersByGenre: async (_: any, { genreId }: { genreId: number }) => {
      return await User.find({ favoriteGenres: genreId });
    }
  },
  
  Mutation: {
    signup: async (_: any, { username, email, password, dateOfBirth }: { username: string, email: string, password: string, dateOfBirth: string }, context: Context) => {
      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        throw new Error(existingUser.email === email ? 'Email already in use' : 'Username already taken');
      }

      const hashedPassword = await hashPassword(password);
      const user = new User({
        username,
        email,
        password: hashedPassword,
        dateOfBirth: new Date(dateOfBirth),
        profileComplete: true,
      });
      await user.save();
      const token = generateToken(user.id as string);
      context.res.cookie('token', token, COOKIE_OPTIONS);
      return user;
    },

    login: async (_: any, { email, password }: { email: string, password: string }, context: Context) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('No account found with this email');
      }
      if (!user.password) {
        throw new Error('This account uses Google Sign-In. Please log in with Google.');
      }

      const valid = await comparePassword(password, user.password);
      if (!valid) {
        throw new Error('Incorrect password');
      }

      const token = generateToken(user.id as string);
      context.res.cookie('token', token, COOKIE_OPTIONS);
      return user;
    },

    googleAuth: async (_: any, { googleToken }: { googleToken: string }, context: Context) => {
      // Verify the Google ID token
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        throw new Error('Google OAuth is not configured on the server');
      }
      const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error('Invalid Google token');
      }

      const { sub: googleId, email, name } = payload;

      // Find existing user or create new one
      let user = await User.findOne({ $or: [{ googleId }, { email }] });

      if (user) {
        // If user exists by email but doesn't have googleId, link it
        if (!user.googleId) {
          user.googleId = googleId;
          await user.save();
        }
      } else {
        // Create new user from Google data
        // Generate a unique username from the Google name
        const baseUsername = (name || email!.split('@')[0])!.replace(/\s+/g, '').toLowerCase();
        let username = baseUsername;
        let counter = 1;
        while (await User.findOne({ username })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        user = new User({
          username,
          email,
          googleId,
          profileComplete: false, // Will need to provide DOB
        });
        await user.save();
      }

      const token = generateToken(user.id as string);
      context.res.cookie('token', token, COOKIE_OPTIONS);
      return user;
    },

    completeProfile: async (_: any, { dateOfBirth }: { dateOfBirth: string }, context: Context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const user = await User.findByIdAndUpdate(
        context.userId,
        {
          dateOfBirth: new Date(dateOfBirth),
          profileComplete: true,
        },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    },

    createUser: async (_: any, { username, email }: { username: string, email: string }) => {
      const user = new User({ username, email });
      return await user.save();
    },
    addMovieToHistory: async (_: any, { mediaId, type, title, poster, genre, rating }: { mediaId: number, type: string, title: string, poster: string, genre: number[], rating: number }, context: Context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }
      return await User.findByIdAndUpdate(
        context.userId,
        { 
          $push: { watchHistory: { id: mediaId, type, title, poster, genre, rating, watchedAt: new Date() } } 
        },
        { new: true }
      );
    },

    addToWatchHistory: async (_: any, { mediaId, type, title, poster, genre, rating }: { mediaId: number, type: string, title: string, poster: string, genre: number[], rating: number }, context: Context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }
      return await User.findByIdAndUpdate(
        context.userId,
        {
          $push: { watchHistory: { id: mediaId, type, title, poster, genre, rating, watchedAt: new Date() } }
        },
        { new: true }
      );
    },

    addToWatchlist: async (_: any, { mediaId, type, title, poster, genre }: { mediaId: number, type: string, title: string, poster: string, genre: number[] }, context: Context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }
      // Check if already in watchlist
      const user = await User.findById(context.userId);
      if (user?.watchlist.some(w => w.id === mediaId && w.type === type)) {
        return user;
      }
      return await User.findByIdAndUpdate(
        context.userId,
        { $push: { watchlist: { id: mediaId, type, title, poster, genre } } },
        { new: true }
      );
    },

    removeFromWatchlist: async (_: any, { mediaId, type }: { mediaId: number, type: string }, context: Context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }
      return await User.findByIdAndUpdate(
        context.userId,
        { $pull: { watchlist: { id: mediaId, type } } },
        { new: true }
      );
    },

    logout: async (_: any, __: any, context: Context) => {
      context.res.clearCookie('token', { path: '/' });
      return true;
    }
  }
};