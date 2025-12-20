use sea_orm::entity::prelude::*;

pub mod accounts {
    use super::*;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
    #[sea_orm(table_name = "research_accounts")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: i64,
        pub provider: String,
        pub display_name: String,
        pub enabled: bool,
        pub allowed_caps_json: String,
        pub permissions_json: Option<String>,
        pub auth_encrypted: Option<Vec<u8>>,
        pub created_at: DateTime,
        pub updated_at: DateTime,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod streams {
    use super::*;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
    #[sea_orm(table_name = "research_streams")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: i64,
        pub account_id: i64,
        pub name: String,
        pub provider: String,
        pub enabled: bool,
        pub config_json: Option<String>,
        pub schedule_json: Option<String>,
        pub last_sync_at: Option<DateTime>,
        pub last_error: Option<String>,
        pub created_at: DateTime,
        pub updated_at: DateTime,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {
        #[sea_orm(
            belongs_to = "super::accounts::Entity",
            from = "Column::AccountId",
            to = "super::accounts::Column::Id",
            on_delete = "Cascade"
        )]
        Account,
    }

    impl Related<super::accounts::Entity> for Entity {
        fn to() -> RelationDef {
            Relation::Account.def()
        }
    }

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod items {
    use super::*;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
    #[sea_orm(table_name = "research_items")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: i64,
        pub account_id: Option<i64>,
        pub stream_id: Option<i64>,
        pub source_type: String,
        pub external_id: String,
        pub url: Option<String>,
        pub title: String,
        pub excerpt: Option<String>,
        pub author: Option<String>,
        pub published_at: Option<DateTime>,
        pub status: String,
        pub tags_json: Option<String>,
        pub payload_json: Option<String>,
        pub created_at: DateTime,
        pub updated_at: DateTime,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {
        #[sea_orm(
            belongs_to = "super::accounts::Entity",
            from = "Column::AccountId",
            to = "super::accounts::Column::Id",
            on_delete = "SetNull"
        )]
        Account,
        #[sea_orm(
            belongs_to = "super::streams::Entity",
            from = "Column::StreamId",
            to = "super::streams::Column::Id",
            on_delete = "SetNull"
        )]
        Stream,
    }

    impl Related<super::accounts::Entity> for Entity {
        fn to() -> RelationDef {
            Relation::Account.def()
        }
    }

    impl Related<super::streams::Entity> for Entity {
        fn to() -> RelationDef {
            Relation::Stream.def()
        }
    }

    impl ActiveModelBehavior for ActiveModel {}
}
