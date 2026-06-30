export const typeDefs = `#graphql
    type WatchHistory {
        id: Int!
        type: String!
        title: String!
        poster: String!
        genre: [Int!]
        rating: Float!
        watchedAt: String!
    }

    type WatchlistItem {
        id: Int!
        type: String!
        title: String!
        poster: String!
        genre: [Int!]
    }

    type User {
        id: ID!
        username: String!
        email: String!
        dateOfBirth: String
        profileComplete: Boolean!
        favoriteGenres: [Int!]!
        watchHistory: [WatchHistory!]!
        watchlist: [WatchlistItem!]!
    }

    type Query {
        me: User
        getUser(id: ID!): User
        getUsersByGenre(genreId: Int!): [User!]!
    }

    type Mutation {
        signup(username: String!, email: String!, password: String!, dateOfBirth: String!): User!
        login(email: String!, password: String!): User!
        googleAuth(googleToken: String!): User!
        logout: Boolean!
        completeProfile(dateOfBirth: String!): User!
        createUser(username: String!, email: String!): User!
        addMovieToHistory(mediaId: Int!, type: String!, title: String!, poster: String!, genre: [Int!], rating: Float!): User!
        addToWatchHistory(mediaId: Int!, type: String!, title: String!, poster: String!, genre: [Int!], rating: Float!): User!
        addToWatchlist(mediaId: Int!, type: String!, title: String!, poster: String!, genre: [Int!]): User!
        removeFromWatchlist(mediaId: Int!, type: String!): User!
    }
`;
