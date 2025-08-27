# DOT Attendance - Infrastructure as Code
# Multi-cloud setup with AWS and Google Cloud Platform

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    # Backend configuration provided via CLI
  }
}

# Variable declarations
variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "dot-attendance"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "gcp_project" {
  description = "GCP Project ID"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

# Local values
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Application = "dot-attendance"
  }
  
  name_prefix = "${var.project_name}-${var.environment}"
}

# Provider configurations
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = local.common_tags
  }
}

provider "google" {
  project = var.gcp_project
  region  = "us-central1"
  
  labels = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

provider "google-beta" {
  project = var.gcp_project
  region  = "us-central1"
}

# AWS Infrastructure
module "aws_infrastructure" {
  source = "./modules/aws"
  
  name_prefix   = local.name_prefix
  environment   = var.environment
  domain_name   = var.domain_name
  common_tags   = local.common_tags
}

# Google Cloud Infrastructure
module "gcp_infrastructure" {
  source = "./modules/gcp"
  
  project_id    = var.gcp_project
  name_prefix   = local.name_prefix
  environment   = var.environment
  domain_name   = var.domain_name
}

# Monitoring and Alerting
module "monitoring" {
  source = "./modules/monitoring"
  
  name_prefix       = local.name_prefix
  environment       = var.environment
  aws_region        = var.aws_region
  gcp_project       = var.gcp_project
  app_url          = module.aws_infrastructure.app_url
  api_url          = module.aws_infrastructure.api_url
  functions_url    = module.gcp_infrastructure.functions_url
}

# Outputs
output "app_url" {
  description = "Application URL"
  value       = module.aws_infrastructure.app_url
}

output "api_url" {
  description = "API Gateway URL"
  value       = module.aws_infrastructure.api_url
}

output "cdn_url" {
  description = "CloudFront CDN URL"
  value       = module.aws_infrastructure.cdn_url
}

output "functions_url" {
  description = "Firebase Functions URL"
  value       = module.gcp_infrastructure.functions_url
}

output "database_url" {
  description = "Firestore database URL"
  value       = module.gcp_infrastructure.database_url
}

output "monitoring_dashboard" {
  description = "Monitoring dashboard URL"
  value       = module.monitoring.dashboard_url
}