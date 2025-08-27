# Staging Environment Configuration

environment = "staging"
domain_name = "staging.dotattendance.com"

# AWS Configuration
aws_region = "us-west-2"

# Application Configuration
app_config = {
  min_instances = 1
  max_instances = 3
  instance_type = "t3.micro"
  
  # Auto Scaling
  cpu_threshold    = 70
  memory_threshold = 80
  
  # Health Check
  health_check_path         = "/health"
  health_check_interval     = 30
  healthy_threshold_count   = 2
  unhealthy_threshold_count = 2
}

# Database Configuration
database_config = {
  backup_retention_days = 7
  point_in_time_recovery = true
  deletion_protection   = false
}

# CDN Configuration
cdn_config = {
  price_class = "PriceClass_100"  # US, Canada, Europe
  ttl_default = 86400             # 24 hours
  ttl_max     = 31536000          # 1 year
}

# Monitoring Configuration
monitoring_config = {
  log_retention_days = 7
  metric_retention_days = 30
  
  # Alerting thresholds
  error_rate_threshold     = 5    # 5% error rate
  response_time_threshold  = 2000 # 2 seconds
  availability_threshold   = 99.5 # 99.5% uptime
}

# Security Configuration
security_config = {
  # WAF rules
  enable_waf = true
  rate_limit = 2000  # requests per 5-minute window
  
  # SSL/TLS
  ssl_policy = "TLSv1.2_2021"
  
  # CORS
  cors_origins = [
    "https://staging.dotattendance.com",
    "https://staging-app.dotattendance.com",
    "http://localhost:3000"  # Development
  ]
}

# Cost Optimization
cost_optimization = {
  enable_spot_instances = true
  schedule_downtime    = false  # Keep staging always on
}