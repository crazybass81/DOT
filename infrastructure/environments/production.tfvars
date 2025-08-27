# Production Environment Configuration

environment = "production"
domain_name = "dotattendance.com"

# AWS Configuration
aws_region = "us-west-2"

# Application Configuration
app_config = {
  min_instances = 3
  max_instances = 10
  instance_type = "t3.medium"
  
  # Auto Scaling
  cpu_threshold    = 60
  memory_threshold = 70
  
  # Health Check
  health_check_path         = "/health"
  health_check_interval     = 15
  healthy_threshold_count   = 3
  unhealthy_threshold_count = 2
}

# Database Configuration
database_config = {
  backup_retention_days = 30
  point_in_time_recovery = true
  deletion_protection   = true
  
  # Multi-region backup
  backup_regions = ["us-east-1", "eu-west-1"]
}

# CDN Configuration
cdn_config = {
  price_class = "PriceClass_All"  # Global distribution
  ttl_default = 86400             # 24 hours
  ttl_max     = 31536000          # 1 year
  
  # Performance optimization
  compress_content = true
  http2_enabled   = true
  ipv6_enabled    = true
}

# Monitoring Configuration
monitoring_config = {
  log_retention_days = 30
  metric_retention_days = 90
  
  # Alerting thresholds (stricter for production)
  error_rate_threshold     = 1    # 1% error rate
  response_time_threshold  = 1000 # 1 second
  availability_threshold   = 99.9 # 99.9% uptime
  
  # Enhanced monitoring
  detailed_monitoring = true
  x_ray_tracing      = true
}

# Security Configuration
security_config = {
  # WAF rules
  enable_waf = true
  rate_limit = 5000  # Higher limit for production
  
  # DDoS protection
  enable_shield_advanced = true
  
  # SSL/TLS
  ssl_policy = "TLSv1.2_2021"
  
  # CORS (restrictive for production)
  cors_origins = [
    "https://dotattendance.com",
    "https://app.dotattendance.com"
  ]
  
  # Security headers
  security_headers = {
    strict_transport_security = "max-age=31536000; includeSubDomains"
    content_type_options     = "nosniff"
    frame_options           = "DENY"
    xss_protection          = "1; mode=block"
    referrer_policy         = "strict-origin-when-cross-origin"
  }
}

# High Availability Configuration
ha_config = {
  multi_az_deployment = true
  cross_region_backup = true
  disaster_recovery   = true
  
  # RTO/RPO targets
  recovery_time_objective  = 300  # 5 minutes
  recovery_point_objective = 900  # 15 minutes
}

# Cost Optimization
cost_optimization = {
  enable_spot_instances = false  # Use reserved instances for production
  reserved_instances   = true
  schedule_downtime   = false
  
  # Resource optimization
  enable_auto_scaling = true
  enable_rightsizing = true
}