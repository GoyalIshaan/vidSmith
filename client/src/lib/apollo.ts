import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";

const httpLink = createHttpLink({
  uri: "http://localhost:3000/graphql",
  //"http://localhost:3000/graphql", // Your gateway GraphQL endpoint
  // "https://api.vidsmith.org/graphql",
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
