# FeedbackFlow Core Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Core Service (feedbackflow-core) with Users, Organizations, OrgMembers, and Hierarchy entities using Wix Ninja/SDL infrastructure.

**Architecture:** Entity-per-Proto design with 4 SDL tables in `use_shared_poc_cluster`. Each entity has dedicated proto, domain, mapper, SDL wrapper, and service implementation. Uses Wix Identity for authentication via `IdentityExtractor` pattern.

**Tech Stack:** Java 17+, Bazel, Loop Prime, SDL (SimpleDataLayer), Protocol Buffers, Automapper

**Location:** `/Users/nissano/wix-academy/feedbackflow/feedbackflow-core/`

**Reference Repos:**
- Pattern source: `/Users/nissano/premium/premium-server/premium-subscriptions-product-change`
- Identity pattern: `/Users/nissano/premium-billing/premium-invoices`

---

## Task 1: Project Structure Setup

**Goal:** Create the basic project directory structure and BUILD.bazel skeleton.

**Files:**
- Create: `wix-academy/feedbackflow/feedbackflow-core/BUILD.bazel`
- Create: `wix-academy/feedbackflow/feedbackflow-core/proto/wix/feedbackflow/core/v1/.gitkeep`
- Create: `wix-academy/feedbackflow/feedbackflow-core/src/com/wixpress/feedbackflow/core/v1/.gitkeep`
- Create: `wix-academy/feedbackflow/feedbackflow-core/test/com/wixpress/feedbackflow/core/v1/.gitkeep`

**Step 1: Create directory structure**

```bash
cd /Users/nissano/wix-academy
mkdir -p feedbackflow/feedbackflow-core/proto/wix/feedbackflow/core/v1/upstream/wix/common
mkdir -p feedbackflow/feedbackflow-core/src/com/wixpress/feedbackflow/core/v1/{domain,mappers,sdl,services,validators}
mkdir -p feedbackflow/feedbackflow-core/test/com/wixpress/feedbackflow/core/v1
```

**Step 2: Create initial BUILD.bazel**

Create file `wix-academy/feedbackflow/feedbackflow-core/BUILD.bazel`:

```bazel
load("@server_infra//framework/loom-prime:macros.bzl", "prime_app")

prime_app(
    name = "feedbackflow-core",
    artifact = "com.wixpress.feedbackflow.feedbackflow-core",
    entry_point = "com.wixpress.feedbackflow.core.v1.FeedbackflowCore",

    features = [
        "ninja",
    ],

    service = "wix.feedbackflow.core.v1.UserService",

    secondary_services = [
        "com.wixpress.feedbackflow.core.v1.OrganizationService",
        "com.wixpress.feedbackflow.core.v1.OrgMemberService",
        "com.wixpress.feedbackflow.core.v1.HierarchyService",
    ],

    sdl = {
        "use_shared_poc_cluster": {
            "feedbackflow_core": {
                "users": {
                    "entity": "com.wixpress.feedbackflow.core.v1.domain.UserDomain",
                },
                "organizations": {
                    "entity": "com.wixpress.feedbackflow.core.v1.domain.OrganizationDomain",
                },
                "org_members": {
                    "entity": "com.wixpress.feedbackflow.core.v1.domain.OrgMemberDomain",
                },
                "hierarchy": {
                    "entity": "com.wixpress.feedbackflow.core.v1.domain.HierarchyDomain",
                },
            },
        },
    },

    proto_deps = [
        "@p13n//protos/data/src/main/proto",
        "@p13n//protos/domain-events/src/main/proto",
    ],

    deps = [
        "@server_infra//framework/loom-prime/src/main/java/com/wixpress/framework",
        "@server_infra//iptf/simple-data-layer/src/main/java/com/wixpress/infra/sdl/ninja/api",
        "@server_infra//b7/java-automapper/src/main/java/com/wixpress/infra/automapper/java/transformer",
        "@server_infra//b7/java-automapper/src/main/java/com/wixpress/infra/automapper/java/annotations",
    ],

    deps_test = [
        "@server_infra//framework/ninja/rpc/grpc/errors-builder-test-kit",
    ],
)
```

**Step 3: Copy upstream proto files**

Copy query and paging protos from reference project:

```bash
cp /Users/nissano/premium/premium-server/premium-subscriptions-product-change/proto/wix/premium/product/change/v1/upstream/wix/common/*.proto \
   /Users/nissano/wix-academy/feedbackflow/feedbackflow-core/proto/wix/feedbackflow/core/v1/upstream/wix/common/
```

**Step 4: Commit**

```bash
cd /Users/nissano/wix-academy/feedbackflow/feedbackflow-core
git add .
git commit -m "chore: initial feedbackflow-core project structure"
```

---

## Task 2: User Entity - Proto Definition

**Goal:** Define the User entity proto with SDL annotations and CRUD service.

**Files:**
- Create: `proto/wix/feedbackflow/core/v1/feedbackflow_core_user.proto`

**Step 1: Create User proto file**

Create file `proto/wix/feedbackflow/core/v1/feedbackflow_core_user.proto`:

```protobuf
syntax = "proto3";

package wix.feedbackflow.core.v1;
option java_package = "com.wixpress.feedbackflow.core.v1";

import "google/api/annotations.proto";
import "google/protobuf/wrappers.proto";
import "google/protobuf/timestamp.proto";
import "google/protobuf/field_mask.proto";
import "wix/api/annotations.proto";
import "wix/api/entity.proto";
import "wix/api/validations.proto";
import "wix/feedbackflow/core/v1/upstream/wix/common/query.proto";
import "wix/feedbackflow/core/v1/upstream/wix/common/paging.proto";

// ============================================================================
// USER ENTITY
// ============================================================================

message User {
  option (.wix.api.entity) = {
    fqdn: "wix.feedbackflow.core.v1.user"
    segment: USERS
    domain_events: {
      deleted_include_entity: true
      event_sequence_number: true
      updated_include_modified_fields: true
    }
    query_options: {
      wql: {
        pattern: {
          operator: ALL_APPLICABLE_OPERATORS
          field: "id"
          field: "wix_user_id"
          field: "email"
          field: "is_active"
          sort: BOTH
        }
      }
    }
    events_exposure: INTERNAL
    events_maturity: ALPHA
  };

  option (.wix.api.domain_event) = { event_type: CREATED };
  option (.wix.api.domain_event) = { event_type: UPDATED };
  option (.wix.api.domain_event) = { event_type: DELETED };

  // Standard fields (auto-managed)
  google.protobuf.StringValue id = 1 [
    (.wix.api.format) = GUID,
    (.wix.api.readOnly) = true
  ];

  google.protobuf.Int64Value revision = 2 [
    (.wix.api.readOnly) = true
  ];

  google.protobuf.Timestamp created_date = 3 [
    (.wix.api.readOnly) = true
  ];

  google.protobuf.Timestamp updated_date = 4 [
    (.wix.api.readOnly) = true
  ];

  // Business fields
  string wix_user_id = 5 [(.wix.api.maxLength) = 100];

  string email = 6 [
    (.wix.api.pii) = true,
    (.wix.api.maxLength) = 255
  ];

  string name = 7 [
    (.wix.api.pii) = true,
    (.wix.api.maxLength) = 200
  ];

  google.protobuf.StringValue avatar_url = 8 [(.wix.api.maxLength) = 500];

  google.protobuf.StringValue job_title = 9 [
    (.wix.api.pii) = true,
    (.wix.api.maxLength) = 100
  ];

  google.protobuf.Timestamp hire_date = 10 [(.wix.api.pii) = true];

  bool is_active = 11;
}

// ============================================================================
// USER SERVICE
// ============================================================================

service UserService {
  option (.wix.api.service_maturity) = ALPHA;
  option (.wix.api.service_exposure) = INTERNAL;
  option (.wix.api.service_entity).message = "wix.feedbackflow.core.v1.User";

  rpc CreateUser (CreateUserRequest) returns (CreateUserResponse) {
    option (google.api.http).post = "/v1/users";
    option (.wix.api.permission).name = "FEEDBACKFLOW.USER_CREATE";
    option (.wix.api.required) = "CreateUserRequest.user";
    option (.wix.api.crud) = {
      method: CREATE
      create_options: { item_field: "user" }
    };
    option (.wix.api.emits) = { event_type: CREATED };
  }

  rpc GetUser (GetUserRequest) returns (GetUserResponse) {
    option (google.api.http).get = "/v1/users/{user_id}";
    option (.wix.api.permission).name = "FEEDBACKFLOW.USER_READ";
    option (.wix.api.required) = "GetUserRequest.user_id";
    option (.wix.api.crud) = {
      method: GET_ITEM
      get_options: { id_field: "user_id" }
    };
  }

  rpc GetUserByWixId (GetUserByWixIdRequest) returns (GetUserByWixIdResponse) {
    option (google.api.http).get = "/v1/users/wix/{wix_user_id}";
    option (.wix.api.permission).name = "FEEDBACKFLOW.USER_READ";
    option (.wix.api.required) = "GetUserByWixIdRequest.wix_user_id";
  }

  rpc UpdateUser (UpdateUserRequest) returns (UpdateUserResponse) {
    option (google.api.http).patch = "/v1/users/{user.id}";
    option (.wix.api.permission).name = "FEEDBACKFLOW.USER_UPDATE";
    option (.wix.api.required) = "UpdateUserRequest.user";
    option (.wix.api.required) = "UpdateUserRequest.user.id";
    option (.wix.api.required) = "UpdateUserRequest.user.revision";
    option (wix.http.infer_fieldmask) = {
      from: "user"
      fieldmask: "field_mask"
    };
    option (.wix.api.crud) = {
      method: UPDATE
      update_options: {
        item_field: "user"
        fieldmask_field: "field_mask"
      }
    };
    option (.wix.api.emits) = { event_type: UPDATED };
  }

  rpc DeleteUser (DeleteUserRequest) returns (DeleteUserResponse) {
    option (google.api.http).delete = "/v1/users/{user_id}";
    option (.wix.api.permission).name = "FEEDBACKFLOW.USER_DELETE";
    option (.wix.api.required) = "DeleteUserRequest.user_id";
    option (.wix.api.crud) = {
      method: DELETE
      delete_options: { id_field: "user_id" }
    };
    option (.wix.api.emits) = { event_type: DELETED };
  }

  rpc QueryUsers (QueryUsersRequest) returns (QueryUsersResponse) {
    option (google.api.http).post = "/v1/users/query";
    option (.wix.api.permission).name = "FEEDBACKFLOW.USER_READ";
    option (.wix.api.crud) = {
      method: QUERY
      query_options: { items_field: "users" }
    };
  }
}

// ============================================================================
// REQUEST/RESPONSE MESSAGES
// ============================================================================

message CreateUserRequest {
  User user = 1;
}

message CreateUserResponse {
  User user = 1;
}

message GetUserRequest {
  string user_id = 1 [(.wix.api.format) = GUID];
}

message GetUserResponse {
  User user = 1;
}

message GetUserByWixIdRequest {
  string wix_user_id = 1;
}

message GetUserByWixIdResponse {
  User user = 1;
}

message UpdateUserRequest {
  User user = 1;
  google.protobuf.FieldMask field_mask = 2;
}

message UpdateUserResponse {
  User user = 1;
}

message DeleteUserRequest {
  string user_id = 1 [(.wix.api.format) = GUID];
}

message DeleteUserResponse {}

message QueryUsersRequest {
  wix.feedbackflow.core.v1.upstream.wix.common.CursorQuery query = 1;
}

message QueryUsersResponse {
  repeated User users = 1;
  wix.feedbackflow.core.v1.upstream.wix.common.CursorPagingMetadata paging_metadata = 2;
}
```

**Step 2: Verify proto compiles**

```bash
cd /Users/nissano/wix-academy/feedbackflow/feedbackflow-core
bazel build //feedbackflow/feedbackflow-core:feedbackflow-core_proto
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add proto/
git commit -m "feat(user): add User entity proto with CRUD service"
```

---

## Task 3: User Entity - Domain Class

**Goal:** Create the UserDomain record class for SDL persistence.

**Files:**
- Create: `src/com/wixpress/feedbackflow/core/v1/domain/UserDomain.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/domain/BUILD.bazel`

**Step 1: Create domain BUILD.bazel**

Create file `src/com/wixpress/feedbackflow/core/v1/domain/BUILD.bazel`:

```bazel
java_library(
    name = "domain",
    srcs = glob(["*.java"]),
    visibility = ["//visibility:public"],
    deps = [
        "@server_infra//iptf/simple-data-layer/src/main/java/com/wixpress/infra/sdl/api/annotations",
    ],
)
```

**Step 2: Create UserDomain class**

Create file `src/com/wixpress/feedbackflow/core/v1/domain/UserDomain.java`:

```java
package com.wixpress.feedbackflow.core.v1.domain;

import com.wixpress.infra.sdl.api.annotations.Id;
import com.wixpress.infra.sdl.api.annotations.IdGeneration;
import com.wixpress.infra.sdl.api.annotations.Pii;
import com.wixpress.infra.sdl.api.annotations.Kind;
import com.wixpress.infra.sdl.api.annotations.Tenancy;
import com.wixpress.infra.sdl.api.annotations.TenancyType;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Tenancy(tenancyType = TenancyType.SINGLE)
public record UserDomain(
    @Id(idGeneration = IdGeneration.Auto)
    UUID id,

    Long revision,
    Instant createdDate,
    Instant updatedDate,

    // Business fields
    String wixUserId,

    @Pii(kind = Kind.Email)
    String email,

    @Pii(kind = Kind.Name)
    String name,

    Optional<String> avatarUrl,

    @Pii(kind = Kind.Other)
    Optional<String> jobTitle,

    @Pii(kind = Kind.Other)
    Optional<Instant> hireDate,

    boolean isActive
) {
    // Builder pattern for convenient construction
    public static UserDomainBuilder builder() {
        return new UserDomainBuilder();
    }

    public static UserDomainBuilder from(UserDomain original) {
        return new UserDomainBuilder(original);
    }

    public static class UserDomainBuilder {
        private UUID id;
        private Long revision;
        private Instant createdDate;
        private Instant updatedDate;
        private String wixUserId;
        private String email;
        private String name;
        private Optional<String> avatarUrl = Optional.empty();
        private Optional<String> jobTitle = Optional.empty();
        private Optional<Instant> hireDate = Optional.empty();
        private boolean isActive = true;

        public UserDomainBuilder() {}

        public UserDomainBuilder(UserDomain original) {
            this.id = original.id();
            this.revision = original.revision();
            this.createdDate = original.createdDate();
            this.updatedDate = original.updatedDate();
            this.wixUserId = original.wixUserId();
            this.email = original.email();
            this.name = original.name();
            this.avatarUrl = original.avatarUrl();
            this.jobTitle = original.jobTitle();
            this.hireDate = original.hireDate();
            this.isActive = original.isActive();
        }

        public UserDomainBuilder withId(UUID id) {
            this.id = id;
            return this;
        }

        public UserDomainBuilder withRevision(Long revision) {
            this.revision = revision;
            return this;
        }

        public UserDomainBuilder withCreatedDate(Instant createdDate) {
            this.createdDate = createdDate;
            return this;
        }

        public UserDomainBuilder withUpdatedDate(Instant updatedDate) {
            this.updatedDate = updatedDate;
            return this;
        }

        public UserDomainBuilder withWixUserId(String wixUserId) {
            this.wixUserId = wixUserId;
            return this;
        }

        public UserDomainBuilder withEmail(String email) {
            this.email = email;
            return this;
        }

        public UserDomainBuilder withName(String name) {
            this.name = name;
            return this;
        }

        public UserDomainBuilder withAvatarUrl(String avatarUrl) {
            this.avatarUrl = Optional.ofNullable(avatarUrl);
            return this;
        }

        public UserDomainBuilder withJobTitle(String jobTitle) {
            this.jobTitle = Optional.ofNullable(jobTitle);
            return this;
        }

        public UserDomainBuilder withHireDate(Instant hireDate) {
            this.hireDate = Optional.ofNullable(hireDate);
            return this;
        }

        public UserDomainBuilder withIsActive(boolean isActive) {
            this.isActive = isActive;
            return this;
        }

        public UserDomain build() {
            return new UserDomain(
                id, revision, createdDate, updatedDate,
                wixUserId, email, name, avatarUrl, jobTitle, hireDate, isActive
            );
        }
    }
}
```

**Step 3: Verify build**

```bash
bazel build //feedbackflow/feedbackflow-core/src/com/wixpress/feedbackflow/core/v1/domain:domain
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/com/wixpress/feedbackflow/core/v1/domain/
git commit -m "feat(user): add UserDomain record class"
```

---

## Task 4: User Entity - Mapper

**Goal:** Create Automapper transformers for User proto <-> domain conversion.

**Files:**
- Create: `src/com/wixpress/feedbackflow/core/v1/mappers/UserMappers.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/mappers/BUILD.bazel`

**Step 1: Create mappers BUILD.bazel**

Create file `src/com/wixpress/feedbackflow/core/v1/mappers/BUILD.bazel`:

```bazel
java_library(
    name = "mappers",
    srcs = glob(["*.java"]),
    visibility = ["//visibility:public"],
    deps = [
        "//feedbackflow/feedbackflow-core/src/com/wixpress/feedbackflow/core/v1/domain",
        "//feedbackflow/feedbackflow-core:feedbackflow-core_proto",
        "@server_infra//b7/java-automapper/src/main/java/com/wixpress/infra/automapper/java/transformer",
        "@server_infra//b7/java-automapper/src/main/java/com/wixpress/infra/automapper/java/annotations",
        "@com_google_protobuf//:protobuf_java",
    ],
)
```

**Step 2: Create UserMappers class**

Create file `src/com/wixpress/feedbackflow/core/v1/mappers/UserMappers.java`:

```java
package com.wixpress.feedbackflow.core.v1.mappers;

import com.google.protobuf.StringValue;
import com.google.protobuf.Timestamp;
import com.wixpress.infra.automapper.java.annotations.Automapper;
import com.wixpress.infra.automapper.java.transformer.Transformer;
import com.wixpress.feedbackflow.core.v1.domain.UserDomain;
import com.wixpress.feedbackflow.core.v1.feedbackflow_core_user.User;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Automapper
public class UserMappers {

    // Proto -> Domain transformer
    public static final Transformer<User, UserDomain, Void> userContractTransformer =
        Transformer.define(User.class, UserDomain.class)
            .withFieldComputed(UserDomain::id,
                (User u) -> u.hasId() ? UUID.fromString(u.getId().getValue()) : null)
            .withFieldComputed(UserDomain::revision,
                (User u) -> u.hasRevision() ? u.getRevision().getValue() : null)
            .withFieldComputed(UserDomain::createdDate,
                (User u) -> u.hasCreatedDate() ? toInstant(u.getCreatedDate()) : null)
            .withFieldComputed(UserDomain::updatedDate,
                (User u) -> u.hasUpdatedDate() ? toInstant(u.getUpdatedDate()) : null)
            .withFieldComputed(UserDomain::avatarUrl,
                (User u) -> u.hasAvatarUrl() ? Optional.of(u.getAvatarUrl().getValue()) : Optional.empty())
            .withFieldComputed(UserDomain::jobTitle,
                (User u) -> u.hasJobTitle() ? Optional.of(u.getJobTitle().getValue()) : Optional.empty())
            .withFieldComputed(UserDomain::hireDate,
                (User u) -> u.hasHireDate() ? Optional.of(toInstant(u.getHireDate())) : Optional.empty())
            .build();

    // Domain -> Proto transformer
    public static final Transformer<UserDomain, User, Void> userDomainTransformer =
        Transformer.define(UserDomain.class, User.class)
            .withFieldComputed(User::getId,
                (UserDomain d) -> d.id() != null ? StringValue.of(d.id().toString()) : null)
            .withFieldComputed(User::getRevision,
                (UserDomain d) -> d.revision() != null ?
                    com.google.protobuf.Int64Value.of(d.revision()) : null)
            .withFieldComputed(User::getCreatedDate,
                (UserDomain d) -> d.createdDate() != null ? toTimestamp(d.createdDate()) : null)
            .withFieldComputed(User::getUpdatedDate,
                (UserDomain d) -> d.updatedDate() != null ? toTimestamp(d.updatedDate()) : null)
            .withFieldComputed(User::getAvatarUrl,
                (UserDomain d) -> d.avatarUrl().map(StringValue::of).orElse(null))
            .withFieldComputed(User::getJobTitle,
                (UserDomain d) -> d.jobTitle().map(StringValue::of).orElse(null))
            .withFieldComputed(User::getHireDate,
                (UserDomain d) -> d.hireDate().map(UserMappers::toTimestamp).orElse(null))
            .build();

    // Helper methods
    private static Instant toInstant(Timestamp ts) {
        return Instant.ofEpochSecond(ts.getSeconds(), ts.getNanos());
    }

    private static Timestamp toTimestamp(Instant instant) {
        return Timestamp.newBuilder()
            .setSeconds(instant.getEpochSecond())
            .setNanos(instant.getNano())
            .build();
    }
}
```

**Step 3: Verify build**

```bash
bazel build //feedbackflow/feedbackflow-core/src/com/wixpress/feedbackflow/core/v1/mappers:mappers
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/com/wixpress/feedbackflow/core/v1/mappers/
git commit -m "feat(user): add UserMappers with proto-domain transformers"
```

---

## Task 5: User Entity - SDL Wrapper

**Goal:** Create the UserSdl class for database operations.

**Files:**
- Create: `src/com/wixpress/feedbackflow/core/v1/sdl/UserSdl.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/sdl/BUILD.bazel`

**Step 1: Create sdl BUILD.bazel**

Create file `src/com/wixpress/feedbackflow/core/v1/sdl/BUILD.bazel`:

```bazel
java_library(
    name = "sdl",
    srcs = glob(["*.java"]),
    visibility = ["//visibility:public"],
    deps = [
        "//feedbackflow/feedbackflow-core/src/com/wixpress/feedbackflow/core/v1/domain",
        "@server_infra//iptf/simple-data-layer/src/main/java/com/wixpress/infra/sdl/ninja/api",
        "@server_infra//iptf/simple-data-layer/src/main/java/com/wixpress/infra/sdl/api",
    ],
)
```

**Step 2: Create UserSdl class**

Create file `src/com/wixpress/feedbackflow/core/v1/sdl/UserSdl.java`:

```java
package com.wixpress.feedbackflow.core.v1.sdl;

import com.wixpress.feedbackflow.core.v1.domain.UserDomain;
import com.wixpress.infra.sdl.ninja.api.SimpleDataLayer;
import com.wixpress.infra.sdl.api.query.CursorQuery;

import java.util.List;
import java.util.Optional;

public class UserSdl {

    private final SimpleDataLayer<UserDomain> userSdl;

    public UserSdl(SimpleDataLayer<UserDomain> userSdl) {
        this.userSdl = userSdl;
    }

    /**
     * Insert a new user.
     */
    public UserDomain insert(UserDomain user) {
        return userSdl.insert()
            .single(user)
            .execute();
    }

    /**
     * Get user by ID.
     */
    public UserDomain getById(String userId) {
        return userSdl.get()
            .single(userId)
            .execute();
    }

    /**
     * Get user by Wix User ID.
     */
    public Optional<UserDomain> getByWixUserId(String wixUserId) {
        var results = userSdl.query()
            .filter(UserDomainBuilders.FILTER.wixUserId().eq(wixUserId))
            .execute()
            .getAll();

        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    /**
     * Update user with field mask.
     */
    public UserDomain update(UserDomain user, List<String> fieldMaskPaths) {
        return userSdl.patch()
            .single(user.id().toString())
            .revision(user.revision())
            .fieldMask(fieldMaskPaths, user)
            .execute();
    }

    /**
     * Delete user by ID.
     */
    public void delete(String userId) {
        userSdl.delete()
            .single(userId)
            .execute();
    }

    /**
     * Query users with cursor pagination.
     */
    public List<UserDomain> query(CursorQuery query) {
        return userSdl.query()
            .cursorQuery(query)
            .execute()
            .getAll();
    }
}
```

**Step 3: Verify build**

```bash
bazel build //feedbackflow/feedbackflow-core/src/com/wixpress/feedbackflow/core/v1/sdl:sdl
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/com/wixpress/feedbackflow/core/v1/sdl/
git commit -m "feat(user): add UserSdl wrapper for database operations"
```

---

## Task 6: Identity Extractor Utility

**Goal:** Create a utility class for extracting Wix Identity from request context.

**Files:**
- Create: `src/com/wixpress/feedbackflow/core/v1/IdentityExtractor.java`

**Step 1: Create IdentityExtractor class**

Create file `src/com/wixpress/feedbackflow/core/v1/IdentityExtractor.java`:

```java
package com.wixpress.feedbackflow.core.v1;

import com.wix.core.services.identification2.IdentityResponse;
import com.wixpress.framework.RequestContext;
import com.wixpress.framework.errors.ApplicationException;
import com.wixpress.framework.errors.ApplicationExceptionDetails;
import com.wixpress.framework.errors.WixResponseStatus;
import com.wixpress.wixerd.IdentitiesAspect;

import java.util.Optional;

/**
 * Utility for extracting Wix Identity from request context.
 */
public class IdentityExtractor {

    /**
     * Get the target account ID from the current request context.
     * This represents the organization/account making the request.
     *
     * @return The target account ID
     * @throws MissingIdentityError if identity is not present
     */
    public static String targetAccountId() {
        Optional<IdentityResponse> aspectOptional = RequestContext.aspect(IdentitiesAspect.aspectDecoder());
        IdentityResponse aspect = aspectOptional.orElseThrow(MissingIdentityError::new);
        return aspect.getIdentificationData().getContext().getTargetAccountId();
    }

    /**
     * Get the full identity response from request context.
     *
     * @return Optional containing the identity response if present
     */
    public static Optional<IdentityResponse> getIdentity() {
        return RequestContext.aspect(IdentitiesAspect.aspectDecoder());
    }

    /**
     * Check if identity is present in request context.
     */
    public static boolean hasIdentity() {
        return RequestContext.aspect(IdentitiesAspect.aspectDecoder()).isPresent();
    }

    /**
     * Exception thrown when identity is missing from request context.
     */
    public static class MissingIdentityError extends ApplicationException {
        public MissingIdentityError() {
            super(
                "Identity is missing from request context",
                "Authentication required",
                WixResponseStatus.Unauthenticated,
                new ApplicationExceptionDetails("MISSING_IDENTITY")
            );
        }
    }
}
```

**Step 2: Commit**

```bash
git add src/com/wixpress/feedbackflow/core/v1/IdentityExtractor.java
git commit -m "feat: add IdentityExtractor for Wix Identity context"
```

---

## Task 7: User Service Implementation

**Goal:** Implement the UserServiceImpl with all CRUD operations.

**Files:**
- Create: `src/com/wixpress/feedbackflow/core/v1/services/UserServiceImpl.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/services/BUILD.bazel`

**Step 1: Create services BUILD.bazel**

Create file `src/com/wixpress/feedbackflow/core/v1/services/BUILD.bazel`:

```bazel
java_library(
    name = "services",
    srcs = glob(["*.java"]),
    visibility = ["//visibility:public"],
    deps = [
        "//feedbackflow/feedbackflow-core/src/com/wixpress/feedbackflow/core/v1/domain",
        "//feedbackflow/feedbackflow-core/src/com/wixpress/feedbackflow/core/v1/mappers",
        "//feedbackflow/feedbackflow-core/src/com/wixpress/feedbackflow/core/v1/sdl",
        "//feedbackflow/feedbackflow-core:feedbackflow-core_proto",
        "//feedbackflow/feedbackflow-core:feedbackflow-core_ninja",
        "@server_infra//framework/loom-prime/src/main/java/com/wixpress/framework",
    ],
)
```

**Step 2: Create UserServiceImpl class**

Create file `src/com/wixpress/feedbackflow/core/v1/services/UserServiceImpl.java`:

```java
package com.wixpress.feedbackflow.core.v1.services;

import com.wixpress.feedbackflow.core.v1.domain.UserDomain;
import com.wixpress.feedbackflow.core.v1.feedbackflow_core_user.*;
import com.wixpress.feedbackflow.core.v1.mappers.UserMappers;
import com.wixpress.feedbackflow.core.v1.sdl.UserSdl;
import com.wixpress.framework.errors.ApplicationException;
import com.wixpress.framework.errors.ApplicationExceptionDetails;
import com.wixpress.framework.errors.WixResponseStatus;

import java.util.stream.Collectors;

import static com.wixpress.feedbackflow.core.v1.mappers.UserMappers.userContractTransformer;
import static com.wixpress.feedbackflow.core.v1.mappers.UserMappers.userDomainTransformer;

/**
 * Implementation of the User service.
 */
public class UserServiceImpl extends UserServiceNinjaService {

    private final UserSdl userSdl;

    public UserServiceImpl(UserSdl userSdl) {
        this.userSdl = userSdl;
    }

    @Override
    public CreateUserResponse createUser(CreateUserRequest request) {
        var user = request.getUser();

        // Validate required fields
        validateCreateUser(user);

        // Transform to domain and set defaults
        var userDomain = UserDomain.from(userContractTransformer.transform(user))
            .withIsActive(true)
            .build();

        // Insert via SDL
        var createdUser = userSdl.insert(userDomain);

        // Transform back to proto
        return CreateUserResponse.newBuilder()
            .setUser(userDomainTransformer.transform(createdUser))
            .build();
    }

    @Override
    public GetUserResponse getUser(GetUserRequest request) {
        var userDomain = userSdl.getById(request.getUserId());

        return GetUserResponse.newBuilder()
            .setUser(userDomainTransformer.transform(userDomain))
            .build();
    }

    @Override
    public GetUserByWixIdResponse getUserByWixId(GetUserByWixIdRequest request) {
        var userDomain = userSdl.getByWixUserId(request.getWixUserId())
            .orElseThrow(() -> new UserNotFoundError(
                "User not found with wix_user_id: " + request.getWixUserId()));

        return GetUserByWixIdResponse.newBuilder()
            .setUser(userDomainTransformer.transform(userDomain))
            .build();
    }

    @Override
    public UpdateUserResponse updateUser(UpdateUserRequest request) {
        var user = request.getUser();
        var fieldMaskPaths = request.getFieldMask().getPathsList();

        // Transform to domain
        var userDomain = userContractTransformer.transform(user);

        // Update via SDL with field mask
        var updatedUser = userSdl.update(userDomain, fieldMaskPaths);

        return UpdateUserResponse.newBuilder()
            .setUser(userDomainTransformer.transform(updatedUser))
            .build();
    }

    @Override
    public DeleteUserResponse deleteUser(DeleteUserRequest request) {
        userSdl.delete(request.getUserId());
        return DeleteUserResponse.getDefaultInstance();
    }

    @Override
    public QueryUsersResponse queryUsers(QueryUsersRequest request) {
        var users = userSdl.query(request.getQuery())
            .stream()
            .map(userDomainTransformer::transform)
            .collect(Collectors.toList());

        return QueryUsersResponse.newBuilder()
            .addAllUsers(users)
            .build();
    }

    // Validation helpers

    private void validateCreateUser(User user) {
        if (user.getEmail().isEmpty()) {
            throw new ValidationError("email is required");
        }
        if (user.getName().isEmpty()) {
            throw new ValidationError("name is required");
        }
        if (user.getWixUserId().isEmpty()) {
            throw new ValidationError("wix_user_id is required");
        }
    }

    // Exceptions

    public static class UserNotFoundError extends ApplicationException {
        public UserNotFoundError(String message) {
            super(message, message, WixResponseStatus.NotFound,
                new ApplicationExceptionDetails("USER_NOT_FOUND"));
        }
    }

    public static class ValidationError extends ApplicationException {
        public ValidationError(String message) {
            super(message, message, WixResponseStatus.InvalidArgument,
                new ApplicationExceptionDetails("VALIDATION_ERROR"));
        }
    }
}
```

**Step 3: Verify build**

```bash
bazel build //feedbackflow/feedbackflow-core/src/com/wixpress/feedbackflow/core/v1/services:services
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/com/wixpress/feedbackflow/core/v1/services/
git commit -m "feat(user): add UserServiceImpl with CRUD operations"
```

---

## Task 8: App Builder Setup

**Goal:** Create the AppBuilder that wires all dependencies together.

**Files:**
- Create: `src/com/wixpress/feedbackflow/core/v1/FeedbackflowCoreAppBuilder.java`

**Step 1: Create FeedbackflowCoreAppBuilder class**

Create file `src/com/wixpress/feedbackflow/core/v1/FeedbackflowCoreAppBuilder.java`:

```java
package com.wixpress.feedbackflow.core.v1;

import com.wixpress.feedbackflow.core.v1.sdl.UserSdl;
import com.wixpress.feedbackflow.core.v1.services.UserServiceImpl;
import com.wixpress.feedbackflow.core.v1.mappers.UserMappers;

/**
 * Application builder for FeedbackFlow Core service.
 * Configures SDL entities, dependencies, and services.
 */
public class FeedbackflowCoreAppBuilder {

    public FeedbackflowCoreNinjaApp build(FeedbackflowCoreNinjaContextBuilder contextBuilder) {
        // Build context with SDL configuration
        var ctx = contextBuilder
            .withSdl((sdlSpecs) -> sdlSpecs
                .withUsers((sdlSpec) -> sdlSpec
                    .enableDomainEvents(UserMappers.userDomainTransformer::transform)
                    .contractToDomainFieldPathTranslators((translatorBuilder) -> translatorBuilder
                        .enableTranslators(
                            com.wixpress.infra.automapper.java.transformer.Translator
                                .derive(UserMappers.userContractTransformer)
                                .build()
                        )
                    )
                    .withoutGdpr()
                    .enablePatchByFilter()
                )
                // TODO: Add organizations, org_members, hierarchy SDL configs
            )
            .build();

        // Create SDL wrappers
        var userSdl = new UserSdl(ctx.sdl().users());

        // Create service implementations
        var userService = new UserServiceImpl(userSdl);

        // Build and return the app
        return new FeedbackflowCoreNinjaApp()
            .withUserService(userService);
            // TODO: Add organization, orgMember, hierarchy services
    }
}
```

**Step 2: Verify full build**

```bash
bazel build //feedbackflow/feedbackflow-core:feedbackflow-core
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/com/wixpress/feedbackflow/core/v1/FeedbackflowCoreAppBuilder.java
git commit -m "feat: add FeedbackflowCoreAppBuilder with User service wiring"
```

---

## Task 9: User Service Tests

**Goal:** Write tests for the User service.

**Files:**
- Create: `test/com/wixpress/feedbackflow/core/v1/UserServiceTest.java`
- Create: `test/com/wixpress/feedbackflow/core/v1/BUILD.bazel`

**Step 1: Create test BUILD.bazel**

Create file `test/com/wixpress/feedbackflow/core/v1/BUILD.bazel`:

```bazel
java_test(
    name = "UserServiceTest",
    srcs = ["UserServiceTest.java"],
    deps = [
        "//feedbackflow/feedbackflow-core:feedbackflow-core",
        "//feedbackflow/feedbackflow-core:feedbackflow-core_proto",
        "//feedbackflow/feedbackflow-core:feedbackflow-core_ninja_test_kit",
        "@server_infra//framework/ninja/rpc/grpc/errors-builder-test-kit",
        "@junit_junit//jar",
        "@org_assertj_assertj_core//jar",
    ],
    test_class = "com.wixpress.feedbackflow.core.v1.UserServiceTest",
)
```

**Step 2: Create UserServiceTest class**

Create file `test/com/wixpress/feedbackflow/core/v1/UserServiceTest.java`:

```java
package com.wixpress.feedbackflow.core.v1;

import com.wixpress.feedbackflow.core.v1.feedbackflow_core_user.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;

import static org.assertj.core.api.Assertions.assertThat;

public class UserServiceTest {

    @RegisterExtension
    static NinjaServiceTestExtension<UserService> testExtension =
        NinjaServiceTestExtension.createTestExtension(UserService.class);

    @Test
    public void createUser_withValidData_createsUser() {
        // Arrange
        var user = User.newBuilder()
            .setWixUserId("wix-123")
            .setEmail("test@example.com")
            .setName("Test User")
            .build();

        var request = CreateUserRequest.newBuilder()
            .setUser(user)
            .build();

        // Act
        var response = testExtension.invoke().createUser(request);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getUser().getId().getValue()).isNotEmpty();
        assertThat(response.getUser().getEmail()).isEqualTo("test@example.com");
        assertThat(response.getUser().getName()).isEqualTo("Test User");
        assertThat(response.getUser().getWixUserId()).isEqualTo("wix-123");
        assertThat(response.getUser().getIsActive()).isTrue();
    }

    @Test
    public void getUser_afterCreate_returnsUser() {
        // Arrange - create user first
        var createResponse = testExtension.invoke().createUser(
            CreateUserRequest.newBuilder()
                .setUser(User.newBuilder()
                    .setWixUserId("wix-456")
                    .setEmail("get-test@example.com")
                    .setName("Get Test User")
                    .build())
                .build());

        var userId = createResponse.getUser().getId().getValue();

        // Act
        var getResponse = testExtension.invoke().getUser(
            GetUserRequest.newBuilder()
                .setUserId(userId)
                .build());

        // Assert
        assertThat(getResponse.getUser().getId().getValue()).isEqualTo(userId);
        assertThat(getResponse.getUser().getEmail()).isEqualTo("get-test@example.com");
    }

    @Test
    public void getUserByWixId_withExistingUser_returnsUser() {
        // Arrange - create user first
        var wixUserId = "wix-unique-" + System.currentTimeMillis();
        testExtension.invoke().createUser(
            CreateUserRequest.newBuilder()
                .setUser(User.newBuilder()
                    .setWixUserId(wixUserId)
                    .setEmail("wix-lookup@example.com")
                    .setName("Wix Lookup User")
                    .build())
                .build());

        // Act
        var response = testExtension.invoke().getUserByWixId(
            GetUserByWixIdRequest.newBuilder()
                .setWixUserId(wixUserId)
                .build());

        // Assert
        assertThat(response.getUser().getWixUserId()).isEqualTo(wixUserId);
    }

    @Test
    public void updateUser_withFieldMask_updatesOnlySpecifiedFields() {
        // Arrange - create user first
        var createResponse = testExtension.invoke().createUser(
            CreateUserRequest.newBuilder()
                .setUser(User.newBuilder()
                    .setWixUserId("wix-update")
                    .setEmail("update-test@example.com")
                    .setName("Original Name")
                    .build())
                .build());

        var createdUser = createResponse.getUser();

        // Act - update only name
        var updateResponse = testExtension.invoke().updateUser(
            UpdateUserRequest.newBuilder()
                .setUser(User.newBuilder()
                    .setId(createdUser.getId())
                    .setRevision(createdUser.getRevision())
                    .setName("Updated Name")
                    .build())
                .build());

        // Assert
        assertThat(updateResponse.getUser().getName()).isEqualTo("Updated Name");
        assertThat(updateResponse.getUser().getEmail()).isEqualTo("update-test@example.com");
    }

    @Test
    public void deleteUser_withExistingUser_deletesUser() {
        // Arrange - create user first
        var createResponse = testExtension.invoke().createUser(
            CreateUserRequest.newBuilder()
                .setUser(User.newBuilder()
                    .setWixUserId("wix-delete")
                    .setEmail("delete-test@example.com")
                    .setName("Delete Test User")
                    .build())
                .build());

        var userId = createResponse.getUser().getId().getValue();

        // Act
        var deleteResponse = testExtension.invoke().deleteUser(
            DeleteUserRequest.newBuilder()
                .setUserId(userId)
                .build());

        // Assert - delete returns empty response
        assertThat(deleteResponse).isNotNull();
    }
}
```

**Step 3: Run tests**

```bash
bazel test //feedbackflow/feedbackflow-core/test/com/wixpress/feedbackflow/core/v1:UserServiceTest
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add test/
git commit -m "test(user): add UserService integration tests"
```

---

## Task 10: Organization Entity (Proto, Domain, Mapper, SDL, Service)

**Goal:** Implement the complete Organization entity following the same pattern as User.

**Files:**
- Create: `proto/wix/feedbackflow/core/v1/feedbackflow_core_org.proto`
- Create: `src/com/wixpress/feedbackflow/core/v1/domain/OrganizationDomain.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/domain/DepartmentDomain.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/domain/TeamDomain.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/mappers/OrganizationMappers.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/sdl/OrganizationSdl.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/services/OrganizationServiceImpl.java`
- Create: `test/com/wixpress/feedbackflow/core/v1/OrganizationServiceTest.java`

**Note:** This task follows the exact same pattern as Tasks 2-9 but for the Organization entity. The Organization entity includes nested Department and Team JSON structures.

**Key differences:**
- `departments` field is `List<DepartmentDomain>` stored as JSON
- `teams` field is `List<TeamDomain>` stored as JSON
- Additional endpoints for managing nested departments/teams

*Detailed implementation steps follow same pattern - proto definition, domain class, mapper, SDL wrapper, service impl, tests.*

**Commit after completion:**
```bash
git add .
git commit -m "feat(org): add Organization entity with nested departments/teams"
```

---

## Task 11: OrgMember Entity (Proto, Domain, Mapper, SDL, Service)

**Goal:** Implement the OrgMember entity for user-organization membership.

**Files:**
- Create: `proto/wix/feedbackflow/core/v1/feedbackflow_core_member.proto`
- Create: `src/com/wixpress/feedbackflow/core/v1/domain/OrgMemberDomain.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/mappers/OrgMemberMappers.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/sdl/OrgMemberSdl.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/services/OrgMemberServiceImpl.java`
- Create: `test/com/wixpress/feedbackflow/core/v1/OrgMemberServiceTest.java`

**Key Features:**
- Links users to organizations
- Includes role enum (employee, manager, hr, admin)
- Unique constraint on (user_id, organization_id)
- Bulk create endpoint for importing members

*Detailed implementation steps follow same pattern.*

**Commit after completion:**
```bash
git add .
git commit -m "feat(member): add OrgMember entity for user-org membership"
```

---

## Task 12: Hierarchy Entity (Proto, Domain, Mapper, SDL, Service)

**Goal:** Implement the Hierarchy entity for manager-employee relationships.

**Files:**
- Create: `proto/wix/feedbackflow/core/v1/feedbackflow_core_hierarchy.proto`
- Create: `src/com/wixpress/feedbackflow/core/v1/domain/HierarchyDomain.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/mappers/HierarchyMappers.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/sdl/HierarchySdl.java`
- Create: `src/com/wixpress/feedbackflow/core/v1/services/HierarchyServiceImpl.java`
- Create: `test/com/wixpress/feedbackflow/core/v1/HierarchyServiceTest.java`

**Key Features:**
- Manager-employee relationship tracking
- Get direct reports for a manager
- Get manager chain for an employee
- Prevent circular hierarchies (validation logic)

*Detailed implementation steps follow same pattern.*

**Commit after completion:**
```bash
git add .
git commit -m "feat(hierarchy): add Hierarchy entity for manager-employee relations"
```

---

## Task 13: Update AppBuilder with All Services

**Goal:** Wire all 4 services together in the AppBuilder.

**Files:**
- Modify: `src/com/wixpress/feedbackflow/core/v1/FeedbackflowCoreAppBuilder.java`

**Step 1: Update AppBuilder**

Update the `FeedbackflowCoreAppBuilder.java` to include all services:

```java
public FeedbackflowCoreNinjaApp build(FeedbackflowCoreNinjaContextBuilder contextBuilder) {
    var ctx = contextBuilder
        .withSdl((sdlSpecs) -> sdlSpecs
            .withUsers((sdlSpec) -> sdlSpec
                .enableDomainEvents(UserMappers.userDomainTransformer::transform)
                .contractToDomainFieldPathTranslators(...)
                .withoutGdpr()
                .enablePatchByFilter()
            )
            .withOrganizations((sdlSpec) -> sdlSpec
                .enableDomainEvents(OrganizationMappers.orgDomainTransformer::transform)
                .contractToDomainFieldPathTranslators(...)
                .withoutGdpr()
                .enablePatchByFilter()
            )
            .withOrgMembers((sdlSpec) -> sdlSpec
                .enableDomainEvents(OrgMemberMappers.memberDomainTransformer::transform)
                .contractToDomainFieldPathTranslators(...)
                .withoutGdpr()
                .enablePatchByFilter()
            )
            .withHierarchy((sdlSpec) -> sdlSpec
                .enableDomainEvents(HierarchyMappers.hierarchyDomainTransformer::transform)
                .contractToDomainFieldPathTranslators(...)
                .withoutGdpr()
                .enablePatchByFilter()
            )
        )
        .build();

    // Create SDL wrappers
    var userSdl = new UserSdl(ctx.sdl().users());
    var orgSdl = new OrganizationSdl(ctx.sdl().organizations());
    var memberSdl = new OrgMemberSdl(ctx.sdl().orgMembers());
    var hierarchySdl = new HierarchySdl(ctx.sdl().hierarchy());

    // Create services
    var userService = new UserServiceImpl(userSdl);
    var orgService = new OrganizationServiceImpl(orgSdl);
    var memberService = new OrgMemberServiceImpl(memberSdl, userSdl, orgSdl);
    var hierarchyService = new HierarchyServiceImpl(hierarchySdl, userSdl, orgSdl);

    return new FeedbackflowCoreNinjaApp()
        .withUserService(userService)
        .withOrganizationService(orgService)
        .withOrgMemberService(memberService)
        .withHierarchyService(hierarchyService);
}
```

**Step 2: Run full build and tests**

```bash
bazel build //feedbackflow/feedbackflow-core:feedbackflow-core
bazel test //feedbackflow/feedbackflow-core/test/...
```

Expected: All builds and tests pass

**Step 3: Commit**

```bash
git add .
git commit -m "feat: complete Core service with all 4 entities wired"
```

---

## Task 14: Integration Testing

**Goal:** Write end-to-end integration tests that test cross-entity operations.

**Files:**
- Create: `test/com/wixpress/feedbackflow/core/v1/CoreServiceIntegrationTest.java`

**Key Test Scenarios:**
1. Create org → add user → add member → verify relationship
2. Create hierarchy → get direct reports → verify chain
3. Update org departments → verify member department references
4. Delete user → verify cascading effects

**Commit after completion:**
```bash
git add .
git commit -m "test: add Core service integration tests"
```

---

## Task 15: Documentation and README

**Goal:** Add documentation for the Core service.

**Files:**
- Create: `wix-academy/feedbackflow/feedbackflow-core/README.md`
- Update: `migration/server/core-service-plan.md` (mark as implemented)

**Commit after completion:**
```bash
git add .
git commit -m "docs: add Core service README and update migration plan"
```

---

## Summary

| Task | Description | Status |
|------|-------------|--------|
| 1 | Project Structure Setup | Pending |
| 2 | User Entity - Proto | Pending |
| 3 | User Entity - Domain | Pending |
| 4 | User Entity - Mapper | Pending |
| 5 | User Entity - SDL | Pending |
| 6 | Identity Extractor | Pending |
| 7 | User Service Implementation | Pending |
| 8 | App Builder Setup | Pending |
| 9 | User Service Tests | Pending |
| 10 | Organization Entity (full) | Pending |
| 11 | OrgMember Entity (full) | Pending |
| 12 | Hierarchy Entity (full) | Pending |
| 13 | Update AppBuilder with All Services | Pending |
| 14 | Integration Testing | Pending |
| 15 | Documentation | Pending |

---

## Execution Notes

**Build commands:**
```bash
# Build all
bazel build //feedbackflow/feedbackflow-core:feedbackflow-core

# Run all tests
bazel test //feedbackflow/feedbackflow-core/test/...

# Run specific test
bazel test //feedbackflow/feedbackflow-core/test/com/wixpress/feedbackflow/core/v1:UserServiceTest
```

**Dependencies to verify exist:**
- `@server_infra//framework/loom-prime`
- `@server_infra//iptf/simple-data-layer`
- `@server_infra//b7/java-automapper`

**If build fails:**
1. Check import paths match actual Wix infrastructure
2. Verify proto dependencies are available
3. Consult `/Users/nissano/wix-academy/server-onboarding/guides/rendered/java/stp` for troubleshooting
