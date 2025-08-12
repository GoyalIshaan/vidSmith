import type { GraphQLResolveInfo } from "graphql";
import type { MercuriusContext } from "mercurius";
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
  info: GraphQLResolveInfo,
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
  videoName: Scalars["String"];
  transcodingFinished?: Maybe<Scalars["Boolean"]>;
  captionsFinished?: Maybe<Scalars["Boolean"]>;
  censorFinished?: Maybe<Scalars["Boolean"]>;
  s3Key?: Maybe<Scalars["String"]>;
  bucketName?: Maybe<Scalars["String"]>;
  captionsKey?: Maybe<Scalars["String"]>;
  manifestKey?: Maybe<Scalars["String"]>;
  thumbnailKey?: Maybe<Scalars["String"]>;
  videoDuration?: Maybe<Scalars["Float"]>;
  createdAt: Scalars["String"];
};

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

/** Input type for a completed part in a multipart upload. */
export type PartInput = {
  ETag: Scalars["String"];
  PartNumber: Scalars["Int"];
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
  initiateMultipartUpload: InitiateUploadResponse;
  /** Generate a presigned URL for a part of a multipart upload. */
  generateUploadPartUrl: Scalars["String"];
  /** Complete a multipart upload. */
  completeMultipartUpload: CompleteMultipartUploadResponse;
  /** Abort a multipart upload. */
  abortMultipartUpload: Scalars["Boolean"];
};

export type MutationinitiateMultipartUploadArgs = {
  videoName: Scalars["String"];
  fileName: Scalars["String"];
  contentType: Scalars["String"];
  size: Scalars["Int"];
};

export type MutationgenerateUploadPartUrlArgs = {
  key: Scalars["String"];
  uploadId: Scalars["String"];
  partNumber: Scalars["Int"];
};

export type MutationcompleteMultipartUploadArgs = {
  key: Scalars["String"];
  uploadId: Scalars["String"];
  videoDBID: Scalars["String"];
  parts: Array<PartInput>;
};

export type MutationabortMultipartUploadArgs = {
  key: Scalars["String"];
  uploadId: Scalars["String"];
  videoDBID: Scalars["String"];
};

export type CompleteMultipartUploadResponse = {
  __typename?: "CompleteMultipartUploadResponse";
  video?: Maybe<Video>;
};

export type InitiateUploadResponse = {
  __typename?: "InitiateUploadResponse";
  uploadId: Scalars["ID"];
  videoDBID: Scalars["ID"];
  key: Scalars["String"];
};

export type Subscription = {
  __typename?: "Subscription";
  /** Listen for when a video finishes processing (transcoding, captions, censor are complete). */
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
  info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
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
  info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo,
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
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Video: ResolverTypeWrapper<Video>;
  ID: ResolverTypeWrapper<Scalars["ID"]>;
  String: ResolverTypeWrapper<Scalars["String"]>;
  Boolean: ResolverTypeWrapper<Scalars["Boolean"]>;
  Float: ResolverTypeWrapper<Scalars["Float"]>;
  PresignedUrl: ResolverTypeWrapper<PresignedUrl>;
  Int: ResolverTypeWrapper<Scalars["Int"]>;
  UploadInfo: ResolverTypeWrapper<UploadInfo>;
  PartInput: PartInput;
  Query: ResolverTypeWrapper<{}>;
  Mutation: ResolverTypeWrapper<{}>;
  CompleteMultipartUploadResponse: ResolverTypeWrapper<CompleteMultipartUploadResponse>;
  InitiateUploadResponse: ResolverTypeWrapper<InitiateUploadResponse>;
  Subscription: ResolverTypeWrapper<{}>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Video: Video;
  ID: Scalars["ID"];
  String: Scalars["String"];
  Boolean: Scalars["Boolean"];
  Float: Scalars["Float"];
  PresignedUrl: PresignedUrl;
  Int: Scalars["Int"];
  UploadInfo: UploadInfo;
  PartInput: PartInput;
  Query: {};
  Mutation: {};
  CompleteMultipartUploadResponse: CompleteMultipartUploadResponse;
  InitiateUploadResponse: InitiateUploadResponse;
  Subscription: {};
};

export type VideoResolvers<
  ContextType = MercuriusContext,
  ParentType extends
    ResolversParentTypes["Video"] = ResolversParentTypes["Video"],
> = {
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  videoName?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  transcodingFinished?: Resolver<
    Maybe<ResolversTypes["Boolean"]>,
    ParentType,
    ContextType
  >;
  captionsFinished?: Resolver<
    Maybe<ResolversTypes["Boolean"]>,
    ParentType,
    ContextType
  >;
  censorFinished?: Resolver<
    Maybe<ResolversTypes["Boolean"]>,
    ParentType,
    ContextType
  >;
  s3Key?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  bucketName?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType
  >;
  captionsKey?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType
  >;
  manifestKey?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType
  >;
  thumbnailKey?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType
  >;
  videoDuration?: Resolver<
    Maybe<ResolversTypes["Float"]>,
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PresignedUrlResolvers<
  ContextType = MercuriusContext,
  ParentType extends
    ResolversParentTypes["PresignedUrl"] = ResolversParentTypes["PresignedUrl"],
> = {
  part?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  url?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UploadInfoResolvers<
  ContextType = MercuriusContext,
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
  ContextType = MercuriusContext,
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
  ContextType = MercuriusContext,
  ParentType extends
    ResolversParentTypes["Mutation"] = ResolversParentTypes["Mutation"],
> = {
  initiateMultipartUpload?: Resolver<
    ResolversTypes["InitiateUploadResponse"],
    ParentType,
    ContextType,
    RequireFields<
      MutationinitiateMultipartUploadArgs,
      "videoName" | "fileName" | "contentType" | "size"
    >
  >;
  generateUploadPartUrl?: Resolver<
    ResolversTypes["String"],
    ParentType,
    ContextType,
    RequireFields<
      MutationgenerateUploadPartUrlArgs,
      "key" | "uploadId" | "partNumber"
    >
  >;
  completeMultipartUpload?: Resolver<
    ResolversTypes["CompleteMultipartUploadResponse"],
    ParentType,
    ContextType,
    RequireFields<
      MutationcompleteMultipartUploadArgs,
      "key" | "uploadId" | "videoDBID" | "parts"
    >
  >;
  abortMultipartUpload?: Resolver<
    ResolversTypes["Boolean"],
    ParentType,
    ContextType,
    RequireFields<
      MutationabortMultipartUploadArgs,
      "key" | "uploadId" | "videoDBID"
    >
  >;
};

export type CompleteMultipartUploadResponseResolvers<
  ContextType = MercuriusContext,
  ParentType extends
    ResolversParentTypes["CompleteMultipartUploadResponse"] = ResolversParentTypes["CompleteMultipartUploadResponse"],
> = {
  video?: Resolver<Maybe<ResolversTypes["Video"]>, ParentType, ContextType>;
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InitiateUploadResponseResolvers<
  ContextType = MercuriusContext,
  ParentType extends
    ResolversParentTypes["InitiateUploadResponse"] = ResolversParentTypes["InitiateUploadResponse"],
> = {
  uploadId?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  videoDBID?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  key?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubscriptionResolvers<
  ContextType = MercuriusContext,
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

export type Resolvers<ContextType = MercuriusContext> = {
  Video?: VideoResolvers<ContextType>;
  PresignedUrl?: PresignedUrlResolvers<ContextType>;
  UploadInfo?: UploadInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  CompleteMultipartUploadResponse?: CompleteMultipartUploadResponseResolvers<ContextType>;
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
  },
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
    videoName?: LoaderResolver<Scalars["String"], Video, {}, TContext>;
    transcodingFinished?: LoaderResolver<
      Maybe<Scalars["Boolean"]>,
      Video,
      {},
      TContext
    >;
    captionsFinished?: LoaderResolver<
      Maybe<Scalars["Boolean"]>,
      Video,
      {},
      TContext
    >;
    censorFinished?: LoaderResolver<
      Maybe<Scalars["Boolean"]>,
      Video,
      {},
      TContext
    >;
    s3Key?: LoaderResolver<Maybe<Scalars["String"]>, Video, {}, TContext>;
    bucketName?: LoaderResolver<Maybe<Scalars["String"]>, Video, {}, TContext>;
    captionsKey?: LoaderResolver<Maybe<Scalars["String"]>, Video, {}, TContext>;
    manifestKey?: LoaderResolver<Maybe<Scalars["String"]>, Video, {}, TContext>;
    thumbnailKey?: LoaderResolver<
      Maybe<Scalars["String"]>,
      Video,
      {},
      TContext
    >;
    videoDuration?: LoaderResolver<
      Maybe<Scalars["Float"]>,
      Video,
      {},
      TContext
    >;
    createdAt?: LoaderResolver<Scalars["String"], Video, {}, TContext>;
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

  CompleteMultipartUploadResponse?: {
    video?: LoaderResolver<
      Maybe<Video>,
      CompleteMultipartUploadResponse,
      {},
      TContext
    >;
  };

  InitiateUploadResponse?: {
    uploadId?: LoaderResolver<
      Scalars["ID"],
      InitiateUploadResponse,
      {},
      TContext
    >;
    videoDBID?: LoaderResolver<
      Scalars["ID"],
      InitiateUploadResponse,
      {},
      TContext
    >;
    key?: LoaderResolver<
      Scalars["String"],
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
