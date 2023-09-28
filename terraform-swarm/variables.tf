variable "aws_region" { default = "us-west-1" }

variable "enable_dns_support"   { default = true }
variable "enable_dns_hostnames" { default = true }

variable "project_name"  { default = "notes" }
variable "vpc_name"      { default = "notes-vpc" }
variable "vcp_cidr"      { default = "10.0.0.0/16" }

variable "vpc_cidr"      { default = "10.0.0.0/16" }
variable "public1_cidr"  { default = "10.0.1.0/24" }
variable "private1_cidr" { default = "10.0.3.0/24" }


variable "ami_id"        { default = "ami-04d1dcfb793f6fa37" }
variable "instance_type" { default = "t2.micro" }
variable "key_pair"      { default = "notes-app-key-pair" }

