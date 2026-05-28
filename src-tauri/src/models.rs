use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Category {
    pub id: u32,
    pub name: String,
    pub color: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Shape {
    pub label: String,
    pub points: Vec<Vec<f64>>,
    pub group_id: Option<u32>,
    pub shape_type: String,
    pub flags: HashMap<String, bool>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LabelMeAnnotation {
    pub version: String,
    pub flags: HashMap<String, bool>,
    pub shapes: Vec<Shape>,
    #[serde(rename = "imagePath")]
    pub image_path: String,
    #[serde(rename = "imageHeight")]
    pub image_height: u32,
    #[serde(rename = "imageWidth")]
    pub image_width: u32,
    pub categories: Vec<Category>,
}
