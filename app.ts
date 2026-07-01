import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { connectDB } from './config/db.js';
import { typeDefs } from './graphql/typedefs.js';
import { resolvers } from './graphql/resolvers.js';
import { verifyToken } from './utils/auth.js';

const startServer = async () => {
  const app = express();
  const PORT = process.env.PORT || 4000;

  await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true, 
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        const tokenFromCookie = req.cookies?.token;
        const authHeader = req.headers.authorization || '';
        const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        const token = tokenFromCookie || tokenFromHeader;
        let userId: string | undefined;

        if (token) {
          try {
            const decoded = verifyToken(token);
            userId = decoded.userId;
          } catch {
            // Invalid token — userId stays undefined, query will return null for `me`
          }
        }

        return { userId, res };
      },
    })
  );

  app.get('ping', (req, res) => {
    res.status(200).json({
      message: 'pong',
      status: 'healthy'
    });
  })

  app.listen(PORT, () => {
    console.log(`Server ready at http://localhost:${PORT}/graphql`);
  });
};

startServer().catch((err) => console.error(err));