pub use sea_orm_migration::prelude::*;

mod m001_initial_schema;
mod m002_app_settings;
mod m003_performance_indexes;
mod m004_feed_sources;
mod m005_idea_references;
mod m006_writing_knowledge_graph;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m001_initial_schema::Migration),
            Box::new(m002_app_settings::Migration),
            Box::new(m003_performance_indexes::Migration),
            Box::new(m004_feed_sources::Migration),
            Box::new(m005_idea_references::Migration),
            Box::new(m006_writing_knowledge_graph::Migration),
        ]
    }
}
