import type { GraphQLResolveInfo } from "graphql";
import type { MercuriusContext } from "mercurius";
import type { FastifyInstance } from "fastify";

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) =>
  | Promise<import("mercurius-codegen").DeepPartial<TResult>>
  | import("mercurius-codegen").DeepPartial<TResult>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>;
};
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  _FieldSet: any;
};

/** A video in the system, tracked by metadata-service. */
export type Video = {
  __typename?: "Video";
  id: Scalars["ID"];
  filename: Scalars["String"];
  status: VideoStatus;
  manifestUrl?: Maybe<Scalars["String"]>;
  captionsUrl?: Maybe<Scalars["String"]>;
};

export enum VideoStatus {
  UPLOADING = "UPLOADING",
  TRANSCODING = "TRANSCODING",
  READY = "READY",
  ERROR = "ERROR",
}

/** Presigned URL for a single part in a multipart upload. */
export type PresignedUrl = {
  __typename?: "PresignedUrl";
  part: Scalars["Int"];
  url: Scalars["String"];
};

/** Information required to upload a new video in multiple parts. */
export type UploadInfo = {
  __typename?: "UploadInfo";
  uploadId: Scalars["ID"];
  presignedUrls: Array<PresignedUrl>;
};

export type Query = {
  __typename?: "Query";
  /** List all videos (basic info). */
  videos: Array<Video>;
  /** Get details for one video by ID. */
  video?: Maybe<Video>;
};

export type QueryvideoArgs = {
  id: Scalars["ID"];
};

export type Mutation = {
  __typename?: "Mutation";
  /** Start a multipart upload for a new video; returns presigned URLs. */
  initiateUpload: InitiateUploadResponse;
};

export type MutationinitiateUploadArgs = {
  filename: Scalars["String"];
};

export type InitiateUploadResponse = {
  __typename?: "InitiateUploadResponse";
  id: Scalars["ID"];
  uploadInfo: UploadInfo;
};

export type Subscription = {
  __typename?: "Subscription";
  /** Listen for when a video finishes processing (status becomes READY). */
  videoProcessed?: Maybe<Video>;
};

export type SubscriptionvideoProcessedArgs = {
  id: Scalars["ID"];
};

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> {
  subscribe: SubscriptionSubscribeFn<
    { [key in TKey]: TResult },
    TParent,
    TContext,
    TArgs
  >;
  resolve?: SubscriptionResolveFn<
    TResult,
    { [key in TKey]: TResult },
    TContext,
    TArgs
  >;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = {},
  TContext = {},
  TArgs = {},
> =
  | ((
      ...args: any[]
    ) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<
  TResult = {},
  TParent = {},
  TContext = {},
  TArgs = {},
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Video: ResolverTypeWrapper<Video>;
  ID: ResolverTypeWrapper<Scalars["ID"]>;
  String: ResolverTypeWrapper<Scalars["String"]>;
  VideoStatus: VideoStatus;
  PresignedUrl: ResolverTypeWrapper<PresignedUrl>;
  Int: ResolverTypeWrapper<Scalars["Int"]>;
  UploadInfo: ResolverTypeWrapper<UploadInfo>;
  Query: ResolverTypeWrapper<{}>;
  Mutation: ResolverTypeWrapper<{}>;
  InitiateUploadResponse: ResolverTypeWrapper<InitiateUploadResponse>;
  Subscription: ResolverTypeWrapper<{}>;
  Boolean: ResolverTypeWrapper<Scalars["Boolean"]>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Video: Video;
  ID: Scalars["ID"];
  String: Scalars["String"];
  PresignedUrl: PresignedUrl;
  Int: Scalars["Int"];
  UploadInfo: UploadInfo;
  Query: {};
  Mutation: {};
  InitiateUploadResponse: InitiateUploadResponse;
  Subscription: {};
  Boolean: Scalars["Boolean"];
};

export type VideoResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes["Video"] = ResolversParentTypes["Video"],
> = {
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  filename?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  status?: Resolver<ResolversTypes["VideoStatus"], ParentType, ContextType>;
  manifestUrl?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType
  >;
  captionsUrl?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType
  >;
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PresignedUrlResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes["PresignedUrl"] = ResolversParentTypes["PresignedUrl"],
> = {
  part?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  url?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UploadInfoResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes["UploadInfo"] = ResolversParentTypes["UploadInfo"],
> = {
  uploadId?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  presignedUrls?: Resolver<
    Array<ResolversTypes["PresignedUrl"]>,
    ParentType,
    ContextType
  >;
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes["Query"] = ResolversParentTypes["Query"],
> = {
  videos?: Resolver<Array<ResolversTypes["Video"]>, ParentType, ContextType>;
  video?: Resolver<
    Maybe<ResolversTypes["Video"]>,
    ParentType,
    ContextType,
    RequireFields<QueryvideoArgs, "id">
  >;
};

export type MutationResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes["Mutation"] = ResolversParentTypes["Mutation"],
> = {
  initiateUpload?: Resolver<
    ResolversTypes["InitiateUploadResponse"],
    ParentType,
    ContextType,
    RequireFields<MutationinitiateUploadArgs, "filename">
  >;
};

export type InitiateUploadResponseResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes["InitiateUploadResponse"] = ResolversParentTypes["InitiateUploadResponse"],
> = {
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  uploadInfo?: Resolver<ResolversTypes["UploadInfo"], ParentType, ContextType>;
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubscriptionResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes["Subscription"] = ResolversParentTypes["Subscription"],
> = {
  videoProcessed?: SubscriptionResolver<
    Maybe<ResolversTypes["Video"]>,
    "videoProcessed",
    ParentType,
    ContextType,
    RequireFields<SubscriptionvideoProcessedArgs, "id">
  >;
};

export type Resolvers<ContextType = Context> = {
  Video?: VideoResolvers<ContextType>;
  PresignedUrl?: PresignedUrlResolvers<ContextType>;
  UploadInfo?: UploadInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  InitiateUploadResponse?: InitiateUploadResponseResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
};

export type Loader<TReturn, TObj, TParams, TContext> = (
  queries: Array<{
    obj: TObj;
    params: TParams;
  }>,
  context: TContext & {
    reply: import("fastify").FastifyReply;
  }
) => Promise<Array<import("mercurius-codegen").DeepPartial<TReturn>>>;
export type LoaderResolver<TReturn, TObj, TParams, TContext> =
  | Loader<TReturn, TObj, TParams, TContext>
  | {
      loader: Loader<TReturn, TObj, TParams, TContext>;
      opts?: {
        cache?: boolean;
      };
    };
export interface Loaders<
  TContext = import("mercurius").MercuriusContext & {
    reply: import("fastify").FastifyReply;
  },
> {
  Video?: {
    id?: LoaderResolver<Scalars["ID"], Video, {}, TContext>;
    filename?: LoaderResolver<Scalars["String"], Video, {}, TContext>;
    status?: LoaderResolver<VideoStatus, Video, {}, TContext>;
    manifestUrl?: LoaderResolver<Maybe<Scalars["String"]>, Video, {}, TContext>;
    captionsUrl?: LoaderResolver<Maybe<Scalars["String"]>, Video, {}, TContext>;
  };

  PresignedUrl?: {
    part?: LoaderResolver<Scalars["Int"], PresignedUrl, {}, TContext>;
    url?: LoaderResolver<Scalars["String"], PresignedUrl, {}, TContext>;
  };

  UploadInfo?: {
    uploadId?: LoaderResolver<Scalars["ID"], UploadInfo, {}, TContext>;
    presignedUrls?: LoaderResolver<
      Array<PresignedUrl>,
      UploadInfo,
      {},
      TContext
    >;
  };

  InitiateUploadResponse?: {
    id?: LoaderResolver<Scalars["ID"], InitiateUploadResponse, {}, TContext>;
    uploadInfo?: LoaderResolver<
      UploadInfo,
      InitiateUploadResponse,
      {},
      TContext
    >;
  };
}
declare module "mercurius" {
  interface IResolvers
    extends Resolvers<import("mercurius").MercuriusContext> {}
  interface MercuriusLoaders extends Loaders {}
}

export type Context = MercuriusContext & {
  uploadClient: UploadClient;
  metadataClient: MetadataClient;
  pubsub: MercuriusContext["pubsub"];
};
