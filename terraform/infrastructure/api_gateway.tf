resource "aws_api_gateway_rest_api" "mastodon_api" {
  name        = "group-5-mastodon-api"
  description = "API Gateway for Mastodon application"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.mastodon_api.id
  parent_id   = aws_api_gateway_rest_api.mastodon_api.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.mastodon_api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
  
  request_parameters = {
    "method.request.path.proxy" = true
  }
}

resource "aws_api_gateway_method" "proxy_root" {
  rest_api_id   = aws_api_gateway_rest_api.mastodon_api.id
  resource_id   = aws_api_gateway_rest_api.mastodon_api.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.mastodon_api.id
  resource_id = aws_api_gateway_method.proxy.resource_id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "ANY"
  type                    = "HTTP_PROXY"
  uri                     = "http://${aws_eip.group_5_mastodon_ec2_eip.public_ip}:3000/{proxy}"
  
  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}

resource "aws_api_gateway_integration" "proxy_root" {
  rest_api_id = aws_api_gateway_rest_api.mastodon_api.id
  resource_id = aws_api_gateway_method.proxy_root.resource_id
  http_method = aws_api_gateway_method.proxy_root.http_method

  integration_http_method = "ANY"
  type                    = "HTTP_PROXY"
  uri                     = "http://${aws_eip.group_5_mastodon_ec2_eip.public_ip}:3000"
}

resource "aws_api_gateway_deployment" "mastodon_deployment" {
  depends_on = [
    aws_api_gateway_integration.proxy,
    aws_api_gateway_integration.proxy_root,
  ]

  rest_api_id = aws_api_gateway_rest_api.mastodon_api.id
}

resource "aws_api_gateway_stage" "mastodon_stage" {
  deployment_id = aws_api_gateway_deployment.mastodon_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.mastodon_api.id
  stage_name    = "prod"
  
  lifecycle {
    ignore_changes = all
  }
}

resource "aws_api_gateway_domain_name" "mastodon_domain" {  
  domain_name              = var.api_domain_name
  regional_certificate_arn = var.certificate_arn
  security_policy          = "TLS_1_2"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_base_path_mapping" "mastodon_mapping" {  
  api_id      = aws_api_gateway_rest_api.mastodon_api.id
  stage_name  = aws_api_gateway_stage.mastodon_stage.stage_name
  domain_name = aws_api_gateway_domain_name.mastodon_domain.domain_name
}