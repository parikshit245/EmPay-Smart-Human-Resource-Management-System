# DevOps Assessment Explanation

## Objective

Deploy the EmPay HRMS application using a production-ready DevOps workflow with Docker Compose, Terraform, Ansible, Jenkins, and AWS EC2.

## DevOps Flow

1. Developer pushes code to GitHub.
2. Jenkins checks out the repository.
3. Jenkins installs dependencies, runs linting, checks TypeScript, and builds the Next.js app.
4. Jenkins builds the Docker image.
5. Terraform provisions an AWS EC2 instance and security group.
6. Ansible connects to EC2, installs Docker, prepares environment variables, and starts Docker Compose.
7. Docker Compose runs PostgreSQL, the Next.js app, and Nginx.
8. The application is available on the EC2 public IP.

## Tool Responsibilities

| Tool | Purpose |
| --- | --- |
| Docker | Packages the Next.js app with its runtime dependencies |
| Docker Compose | Runs app, PostgreSQL, and Nginx together |
| Terraform | Creates AWS EC2 infrastructure as code |
| Ansible | Provisions the EC2 server and deploys the application |
| Jenkins | Automates CI/CD from source code to deployment |
| AWS EC2 | Hosts the production deployment |

## Docker Compose Services

| Service | Description |
| --- | --- |
| `nginx` | Reverse proxy exposed on port 80 |
| `app` | Next.js HRMS application exposed internally on port 3000 |
| `postgres` | PostgreSQL database with persistent Docker volume |

## Security Measures

- Secrets are loaded from `.env` and Ansible variables, not hardcoded in application code.
- Terraform restricts SSH access with `allowed_ssh_cidr`.
- PostgreSQL is not exposed publicly.
- Nginx is the public HTTP entrypoint.
- `.gitignore` excludes local secrets and Terraform state.

## Demo Commands

Local:

```bash
cp .env.production.example .env
docker compose up --build -d
curl http://localhost/api/health
```

AWS infrastructure:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform validate
terraform apply
```

Deployment:

```bash
cp ansible/group_vars/app.yml.example ansible/group_vars/app.yml
ansible-galaxy collection install -r ansible/requirements.yml
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
```

## Viva Points

- Docker makes the app portable across local, Jenkins, and AWS environments.
- Compose defines all runtime services in one declarative file.
- Terraform makes cloud resources repeatable and version controlled.
- Ansible handles server configuration after infrastructure exists.
- Jenkins automates quality checks, build, infrastructure, and deployment stages.
- Nginx provides a normal HTTP entrypoint, while the app container stays behind the proxy.
