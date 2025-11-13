# ZEBRA - Open Source API for Enhancing RMF Metrics

- [ZEBRA - Open Source API for Enhancing RMF Metrics](#zebra---open-source-api-for-enhancing-rmf-metrics)
    - [License Information](#license-information)
    - [About ZEBRA](#about-zebra)
- [System Requirements](#system-requirements)
    - [Distributed Data Server (DDS)](#distributed-data-server-dds)
    - [Node.js Version 22+](#nodejs-version-22)
    - [Redis (Required for HMAI)](#redis-required-for-hmai)
    - [pnpm Package Manager](#pnpm-package-manager)
- [Built-in Third Party Support](#built-in-third-party-support)
    - [Configuring MongoDB](#configuring-mongodb)
    - [Configuring Prometheus](#configuring-prometheus)
    - [Configuring Grafana](#configuring-grafana)
    - [Configuring MySQL](#configuring-mysql)
- [Installing ZEBRA TypeScript](#installing-zebra-typescript)
    - [Manual Installation](#manual-installation)
- [Configuring ZEBRA's Settings](#configuring-zebras-settings)
    - [Field Definitions](#field-definitions)
        - [General Settings](#general-settings)
        - [DDS Settings](#dds-settings)
        - [HMAI Settings](#hmai-settings)
    - [Config File Location](#config-file-location)
    - [Example Configuration](#example-configuration)
- [Starting ZEBRA](#starting-zebra)
- [ZEBRA API](#zebra-api)
    - [API Documentation](#api-documentation)
    - [RMF Monitor III Reports](#rmf-monitor-iii-reports)
        - [List of Supported Monitor III reports](#list-of-supported-monitor-iii-reports)
        - [Request Format](#request-format)
        - [Examples](#examples)
    - [RMF Postprocessor (Monitor I) Reports](#rmf-postprocessor-monitor-i-reports)
        - [List of Supported Postprocessor Reports](#list-of-supported-postprocessor-reports)
        - [Request Format](#request-format-1)
        - [Examples](#examples-1)
    - [HMAI Ingestion API](#hmai-ingestion-api)
        - [Available Endpoints](#available-endpoints)
    - [Exposing RMF Data to Prometheus](#exposing-rmf-data-to-prometheus)
        - [Metrics Endpoint](#metrics-endpoint)
        - [Configuring Metrics](#configuring-metrics)
- [Support](#support)

### License Information 

This program and the accompanying materials are made available under the terms of the Eclipse Public License v2.0 which accompanies this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

SPDX-License-Identifier: EPL-2.0

Copyright Contributors to the Zowe Project.

### About ZEBRA

ZEBRA (Zowe Embedded Browser for RMF and APIs) is an open source incubator project for the Open Mainframe Project&copy;'s [Zowe](https://www.zowe.org/). The main goal of this project is to provide reusable and industry-compliant RMF data in JSON format. The benefit of using JSON is that it is a modern standard that is very attractive to developers. Because of this, there are many applications and use cases for third-party analysis and visualization tools to harvest ZEBRA's metrics.

### 🚀 Built with Modern Technology

**ZEBRA has been completely rewritten in TypeScript** using enterprise-grade, production-ready frameworks and cutting-edge tools:

#### **Backend Architecture**
- 🏗️ **[NestJS](https://nestjs.com/)** - Progressive Node.js framework for scalable server-side applications
- ⚡ **[Fastify](https://fastify.dev/)** - Lightning-fast HTTP framework (up to 20% faster than Express)
- 🔷 **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development with full static analysis
- 🔄 **[BullMQ](https://docs.bullmq.io/)** - Redis-backed job queue for reliable background processing
- 📊 **[Prometheus Client](https://github.com/siimon/prom-client)** - Industry-standard metrics collection
- 🗄️ **[MySQL2](https://github.com/sidorares/node-mysql2)** - High-performance MySQL driver with stream support
- 📁 **[basic-ftp](https://github.com/patrickjuchli/basic-ftp)** - Modern FTP client for mainframe data ingestion

#### **Frontend Stack**
- ⚛️ **[Next.js 16](https://nextjs.org/)** - React framework with Turbopack for blazing-fast builds
- 💎 **[React 19](https://react.dev/)** - Declarative UI with modern hooks and server components
- 🎨 **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS for rapid UI development
- 🔍 **[TanStack Query](https://tanstack.com/query)** (React Query) - Powerful data synchronization and caching
- 📝 **[Zod](https://zod.dev/)** - TypeScript-first schema validation with static type inference
- 🎭 **[Playwright](https://playwright.dev/)** - End-to-end testing framework

#### **Development Tools**
- 📦 **[pnpm](https://pnpm.io/)** - Fast, disk-space efficient monorepo package manager
- 🏢 **[pnpm Workspaces](https://pnpm.io/workspaces)** - Monorepo structure for shared code and dependencies
- 🎯 **[Biome](https://biomejs.dev/)** - Lightning-fast linter and formatter (replaces ESLint + Prettier)
- 🔧 **[tsup](https://tsup.egoist.dev/)** - TypeScript bundler for shared packages
- ⚙️ **[Vitest](https://vitest.dev/)** - Blazing-fast unit testing framework

#### **Integration & Third-Party Services**
- 🟢 **[Redis](https://redis.io/)** - In-memory data store for job queues and caching
- 🍃 **[MongoDB](https://www.mongodb.com/)** - NoSQL database for historical RMF Monitor III data
- 🐬 **[MySQL](https://www.mysql.com/)** - Relational database for HMAI metrics storage
- 📈 **[Prometheus](https://prometheus.io/)** - Time-series metrics monitoring and alerting
- 📊 **[Grafana](https://grafana.com/)** - Beautiful dashboards and data visualization
- 🔐 **[JWT](https://jwt.io/)** - JSON Web Token authentication (optional)

#### **Architecture Highlights**
- 🏛️ **Monorepo Structure** - Shared types, DTOs, and utilities across all packages
- 🔒 **Type-Safe APIs** - End-to-end type safety from backend to frontend
- 🎨 **Modern UI/UX** - Responsive design with loading states, progress bars, and toast notifications
- 🔄 **Real-time Updates** - Polling-based data synchronization with React Query
- 🚦 **API Versioning** - Structured `/api/v2/` endpoints for future compatibility
- 📚 **OpenAPI/Swagger** - Auto-generated interactive API documentation
- 🎭 **E2E Testing** - Comprehensive test coverage with Playwright
- 🏃 **Background Jobs** - Asynchronous processing with retry mechanisms and job scheduling

---

# System Requirements

### Distributed Data Server (DDS)

Currently, ZEBRA requires an instance of RMF DDS (GPMSERVE) running on z/OS as the source of its data. You can find out more about setting up the DDS [here](https://www.ibm.com/docs/en/zos/2.4.0?topic=rmf-setting-up-distributed-data-server-zos). 

### Node.js Version 22+

ZEBRA makes use of the [Node.js](https://nodejs.org/) runtime. **IMPORTANT:** This TypeScript version requires Node.js **version 22 or higher**. 

To check your Node.js version:
```bash
node --version
# Should output v22.0.0 or higher
```

### Redis (Required for HMAI)

Redis is **required** if you want to use HMAI (Hitachi Mainframe Analytics Interpreter) ingestion features. Redis is used for:
- Background job queuing with BullMQ
- Job persistence and retry mechanisms
- Continuous monitoring support

**Installation:**

**RHEL/CentOS:**
```bash
sudo yum install redis
sudo systemctl start redis
sudo systemctl enable redis
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

**Note:** If Redis is not installed or not running, HMAI features will be automatically disabled, but RMF Monitor III and RMF Post Processor will still work.

### pnpm Package Manager

This project uses **pnpm** for package management in the monorepo structure.

**Installation:**
```bash
npm install -g pnpm
```

**Verify installation:**
```bash
pnpm --version
# Should output 9.0.0 or higher
```

---

# Built-in Third Party Support

ZEBRA comes prebuilt with some integrations and frameworks for other software and tools. The following is a list of what is currently supported. All software listed is completely optional and not required for ZEBRA to run, although we strongly recommend taking advantage of these integrations.

| Software                             | Integration with ZEBRA                     |
| ------------------------------------ | ------------------------------------------ |
| [MongoDB](https://www.mongodb.com/)  | Historical Database for RMF III Records    |
| [Prometheus](https://prometheus.io/) | Realtime Data Scraping for RMF III Metrics |
| [Grafana](https://grafana.com/)      | Visualization of RMF III Metrics           |
| [MySQL](https://www.mysql.com/)      | Storage for HMAI Metrics                   |
| [Redis](https://redis.io/)           | Job Queue for HMAI Ingestion               |

### Configuring MongoDB

No configuration needed beyond the standard installation required in order to be compatible with ZEBRA. 

**Reminder:** ZEBRA has to be configured to work with MongoDB via `config/Zconfig.json`.

### Configuring Prometheus

After installing Prometheus, locate the `prometheus.yml` config file and edit it:

```yaml
# my global config
global:
  scrape_interval: 15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
  evaluation_interval: 15s # Evaluate rules every 15 seconds. The default is every 1 minute.
  # scrape_timeout is set to the global default (10s).

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          # - alertmanager:9093

# Load rules once and periodically evaluate them according to the global 'evaluation_interval'.
rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

# A scrape configuration containing exactly one endpoint to scrape:
# Here it's Prometheus itself.
scrape_configs:
  # The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.
  - job_name: "zebra"
  
    metrics_path: "/metrics"
    scrape_interval: 120s

    # scheme defaults to 'http'.

    static_configs:
      - targets: ["127.0.0.1:3090"]
```

where `127.0.0.1:3090` is the host and port where ZEBRA API is running.

**Important:** The new TypeScript version uses `/metrics` as the endpoint (not `/prommetric`). The scrape interval should be greater than the app's internal scrape interval (100-120s recommended).

### Configuring Grafana 

Grafana makes use of Prometheus to visualize ZEBRA metrics. Therefore, in order to use Grafana with ZEBRA you must have Prometheus installed and configured first.

After installing and running Grafana, follow [this guide](https://grafana.com/docs/grafana/latest/datasources/add-a-data-source/) on how to add a Data Source. For the source, you want to use the Prometheus instance you set up before this.

### Configuring MySQL

#### Step 1: Enabling `local_infile`

In the MySQL terminal (accessed by `mysql -u root -p`), run the following command:

```sql
SHOW GLOBAL VARIABLES LIKE 'local_infile';
```

It should return something like:

```
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| local_infile  | OFF   |
+---------------+-------+
1 row in set (1.06 sec)
```

Now, enable `local_infile` by running:

```sql
SET GLOBAL local_infile = 'ON';
```

Verify that it has changed to `ON`:

```sql
SHOW GLOBAL VARIABLES LIKE 'local_infile';
```

You should see:

```
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| local_infile  | ON    |
+---------------+-------+
```

#### Step 2: Edit MySQL Server Configuration File

Manually edit the MySQL server configuration file to make the necessary changes. For example, on MySQL Ver 8.0.36 for Linux on x86_64 (Source distribution), the file is located at `/etc/my.cnf.d/mysql-server.cnf`. The file may look like this:

```
[mysqld]
datadir=/var/lib/mysql
socket=/var/lib/mysql/mysql.sock
log-error=/var/log/mysql/mysqld.log
pid-file=/run/mysqld/mysqld.pid
max_allowed_packet = 256M
innodb_log_file_size = 512M
innodb_buffer_pool_size = 1G
port = 3306
```

Add the following two lines, one below the other:

```
bind-address = 0.0.0.0
local_infile = 1
```

After adding, the file should look like:

```
[mysqld]
datadir=/var/lib/mysql
socket=/var/lib/mysql/mysql.sock
log-error=/var/log/mysql/mysqld.log
pid-file=/run/mysqld/mysqld.pid
max_allowed_packet = 256M
innodb_log_file_size = 512M
innodb_buffer_pool_size = 1G
port = 3306
bind-address = 0.0.0.0
local_infile = 1
```

Save and close the file.

#### Step 3: Edit the Central MySQL Configuration File

For `my.cnf` (usually located at `/etc/my.cnf`), add the line `local_infile = 1` similar to Step 2. Save and close the file.

**Reminder:** ZEBRA has to be configured to work with MySQL via `config/Zconfig.json`.

---

# Installing ZEBRA TypeScript

### Manual Installation

1. Make sure you have the required system specifications as described [here](#system-requirements).

2. (Optional) Install any desired [third party software](#built-in-third-party-support) you want to integrate with ZEBRA.

3. Clone this repository with Git:

```bash
git clone https://github.com/zowe/zebra.git
cd zebra
```

4. Checkout the TypeScript branch:

```bash
git checkout zebraTypescript
```

5. Install pnpm if not already installed:

```bash
npm install -g pnpm
```

6. Install all dependencies:

```bash
pnpm install
```

7. Configure ZEBRA before running (Required):

Copy the template configuration file and edit it with your settings:

```bash
cp config/Zconfig.template.json config/Zconfig.json
```

Edit `config/Zconfig.json` with your DDS, MySQL, and other settings. See [Configuring ZEBRA's Settings](#configuring-zebras-settings) for details.

8. Build the shared package:

```bash
pnpm build:shared
```

9. (Optional) Build the API and Web packages:

```bash
pnpm build
```

10. Run ZEBRA:

```bash
pnpm start
```

If successful, you should see:

```
[API] INFO: Nest application successfully started
[WEB] ✓ Ready in Xms
```

The application will be available at:
- **API:** http://localhost:3090/api
- **Web UI:** http://localhost:3000
- **API Docs:** http://localhost:3090/api/docs

---

# Configuring ZEBRA's Settings

ZEBRA is configured via the `config/Zconfig.json` file. This file must exist before starting the application.

### Field Definitions

##### General Settings

| Field                   | Definition                                                                                 | Required    |
| ----------------------- | ------------------------------------------------------------------------------------------ | ----------- |
| `appurl`                | URL or hostname that ZEBRA is using                                                        | Always      |
| `appport`               | Port that the ZEBRA API is using (default: 3090)                                           | Always      |
| `webport`               | Port that the ZEBRA Web UI is using (default: 3000)                                        | Always      |
| `ppminutesInterval`     | The interval (in minutes) that RMF Postprocessor records are recorded into the DDS         | Always      |
| `rmf3interval`          | The interval (in seconds) that RMF Monitor III records are recorded into the DDS           | Always      |
| `zebra_httptype`        | The http protocol that ZEBRA is using (`http` or `https`)                                 | Always      |
| `use_cert`              | Specifies whether to use TLS for servicing ZEBRA API (`true` or `false`)                  | Always      |
| `mongourl`              | URL or hostname of your instance of MongoDB                                                | For MongoDB |
| `mongoport`             | Port of your instance of MongoDB                                                           | For MongoDB |
| `dbinterval`            | The interval (in seconds) that data is recorded into MongoDB                               | For MongoDB |
| `dbname`                | Name of the database to use in MongoDB                                                     | For MongoDB |
| `useDbAuth`             | Specifies whether to use authentication for MongoDB (`true` or `false`)                    | No          |
| `dbUser`                | Username for MongoDB if using authentication                                               | No          |
| `dbPassword`            | Password for MongoDB if using authentication                                               | No          |
| `authSource`            | Source of MongoDB's authentication (default is `admin`)                                    | No          |
| `grafanaurl`            | URL or hostname of your instance of Grafana                                                | For Grafana |
| `grafanaport`           | Port of your instance of Grafana                                                           | For Grafana |
| `grafanahttptype`       | The http protocol of your instance of Grafana                                              | For Grafana |
| `dds`                   | Contains DDS configurations of one or more LPARs (see [below](#dds-settings))             | Always      |

##### DDS Settings

Each key in the `dds` field represents the name of the LPAR you are configuring. For example, if your LPAR is called `DV01`, your DDS config may look like:

```json
"DV01": {
  "ddshhttptype": "https",
  "ddsbaseurl": "mainframe.example.com",
  "ddsbaseport": "8803",
  "ddsauth": "true",
  "ddsuser": "user",
  "ddspwd": "pass",
  "rmf3filename": "rmfm3.xml",
  "rmfppfilename": "rmfpp.xml",
  "mvsResource": ",DV01,MVS_IMAGE",
  "PCI": 3340,
  "usePrometheus": "true",
  "useMongo": "false"
}
```

| Field              | Definition                                                                                                      | Required       |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | -------------- |
| `ddshhttptype`     | The http protocol that this DDS service is using (`http` or `https`)                                           | Always         |
| `ddsbaseurl`       | URL or host name of this DDS service                                                                            | Always         |
| `ddsbaseport`      | Port of this DDS service                                                                                        | Always         |
| `ddsauth`          | Specifies whether this DDS service uses authentication (`true` or `false`)                                      | No             |
| `ddsuser`          | Username to access this DDS (if `ddsauth` is `true`)                                                            | No             |
| `ddspwd`           | Password to access this DDS (if `ddsauth` is `true`)                                                            | No             |
| `rmf3filename`     | File name used when DDS sends RMF Monitor III records (default: `rmfm3.xml`)                                    | Always         |
| `rmfppfilename`    | File name used when DDS sends RMF Postprocessor records (default: `rmfpp.xml`)                                  | Always         |
| `mvsResource`      | The default resource to query when making requests to this DDS                                                  | Always         |
| `PCI`              | The PCI value of the mainframe                                                                                  | Always         |
| `usePrometheus`    | Specifies whether this DDS should be scraped for Prometheus metrics (`true` or `false`)                         | For Prometheus |
| `useMongo`         | Specifies whether this DDS should store RMF III records in MongoDB (`true` or `false`)                          | For MongoDB    |
| `hmai`             | HMAI configuration for this LPAR (see [below](#hmai-settings))                                                  | For HMAI       |

##### HMAI Settings

HMAI configuration is nested under each LPAR in the `dds` section:

```json
"DV01": {
  "ddshhttptype": "https",
  "ddsbaseurl": "mainframe.example.com",
  "ddsbaseport": "8803",
  // ... other DDS settings ...
  "hmai": {
    "ftp": {
      "host": "mainframe.example.com",
      "port": 21,
      "user": "ftpuser",
      "password": "ftppass",
      "directory": "/hmai/csv/files"
    },
    "mysql": {
      "host": "localhost",
      "port": 3306,
      "user": "zebrauser",
      "password": "zebrapass",
      "database": "zebra_hmai"
    },
    "checkInterval": 300,
    "defaultStartDate": "2024-01-01",
    "continuousMonitoring": true,
    "dataRetention": 90
  }
}
```

| Field                  | Definition                                                                       | Required  |
| ---------------------- | -------------------------------------------------------------------------------- | --------- |
| `ftp.host`             | FTP server hostname (usually same as DDS host)                                   | For HMAI  |
| `ftp.port`             | FTP server port (default: 21)                                                    | For HMAI  |
| `ftp.user`             | FTP username                                                                     | For HMAI  |
| `ftp.password`         | FTP password                                                                     | For HMAI  |
| `ftp.directory`        | Directory path where HMAI CSV files are located                                  | For HMAI  |
| `mysql.host`           | MySQL server hostname                                                            | For HMAI  |
| `mysql.port`           | MySQL server port (default: 3306)                                                | For HMAI  |
| `mysql.user`           | MySQL username                                                                   | For HMAI  |
| `mysql.password`       | MySQL password                                                                   | For HMAI  |
| `mysql.database`       | MySQL database name for HMAI data                                                | For HMAI  |
| `checkInterval`        | Interval in seconds to check for new HMAI files (0 to disable periodic checks)   | No        |
| `defaultStartDate`     | Default start date for HMAI ingestion (YYYY-MM-DD)                               | No        |
| `continuousMonitoring` | Enable continuous monitoring of FTP directory (`true` or `false`)                | No        |
| `dataRetention`        | Number of days to retain HMAI data (0 for unlimited)                             | No        |

### Config File Location

The configuration file is located at: **`config/Zconfig.json`**

A template is provided at: **`config/Zconfig.template.json`**

### Example Configuration

Here's a complete example `Zconfig.json`:

```json
{
  "mongourl": "localhost",
  "dbinterval": "100",
  "dbname": "zebraDB",
  "appurl": "localhost",
  "appport": "3090",
  "webport": "3000",
  "mongoport": "27017",
  "ppminutesInterval": "30",
  "rmf3interval": "100",
  "zebra_httptype": "http",
  "useDbAuth": "false",
  "dbUser": "",
  "dbPassword": "",
  "authSource": "admin",
  "useMongo": "false",
  "use_cert": "false",
  "grafanaurl": "localhost",
  "grafanaport": "3000",
  "grafanahttptype": "http",
  "dds": {
    "DV01": {
      "ddshhttptype": "https",
      "ddsbaseurl": "mainframe.example.com",
      "ddsbaseport": "8803",
      "ddsauth": "true",
      "ddsuser": "user",
      "ddspwd": "pass",
      "rmf3filename": "rmfm3.xml",
      "rmfppfilename": "rmfpp.xml",
      "mvsResource": ",DV01,MVS_IMAGE",
      "PCI": 3340,
      "usePrometheus": "true",
      "useMongo": "false",
      "hmai": {
        "ftp": {
          "host": "mainframe.example.com",
          "port": 21,
          "user": "ftpuser",
          "password": "ftppass",
          "directory": "/hmai/csv"
        },
        "mysql": {
          "host": "localhost",
          "port": 3306,
          "user": "zebrauser",
          "password": "zebrapass",
          "database": "zebra_hmai"
        },
        "checkInterval": 300,
        "defaultStartDate": "2024-01-01",
        "continuousMonitoring": true,
        "dataRetention": 90
      }
    }
  }
}
```

**Note:** After editing `config/Zconfig.json`, restart the application for changes to take effect.

---

# Starting ZEBRA

Once configured, start ZEBRA with:

```bash
pnpm start
```

This will start both the API server and the Web UI in development mode.

**For production:**

```bash
pnpm build
pnpm start:prod
```

**Environment Variables:**

You can override certain settings with environment variables:

```bash
# Disable authentication (for testing)
DISABLE_AUTH=true pnpm start

# Disable Redis/HMAI features
DISABLE_REDIS=true pnpm start

# Custom config path
CONFIG_PATH=/custom/path/Zconfig.json pnpm start

# Custom port
PORT=4000 pnpm start
```

**Accessing ZEBRA:**

- **Web UI:** http://localhost:3000
- **API:** http://localhost:3090/api/v2
- **API Documentation (Swagger):** http://localhost:3090/api/docs
- **Prometheus Metrics:** http://localhost:3090/metrics

---

# ZEBRA API

The new TypeScript API uses versioning (currently v2) and follows RESTful conventions.

### API Documentation

Full interactive Swagger/OpenAPI documentation is available at:

**http://localhost:3090/api/docs**

### RMF Monitor III Reports

RMF Monitor III reports offer near realtime records. These reports' intervals are much shorter than that of RMF Postprocessor.

##### List of Supported Monitor III reports

These report types are confirmed to be parsable by ZEBRA.

Each report links to its official IBM&copy; documentation.

| Report                                                                                       | Description                               |
| -------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [CHANNEL](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/chan3.htm#chan3) | Channel Path Activity                     |
| [CPC](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/cfc3.htm#cfc3)       | CPC Capacity                              |
| [DELAY](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/delay.htm#delay)   | Delay                                     |
| [DEV](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/devx.htm#devx)       | Device Delays                             |
| [DEVR](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/devrx.htm#devrx)    | Device Resource Delays                    |
| [DSND](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/dsnd.htm#dsnd)      | Data Set Delays                           |
| [EADM](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/m3-eadm.htm)        | Extended Asynchronous Data Mover Activity |
| [ENCLAVE](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/enclave.htm)     | Enclave                                   |
| [ENQ](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/enqx.htm)            | Enqueue Delays                            |
| [HSM](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/hsm.htm)             | Hierarchical Storage Manager Delays       |
| [JES](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/jes.htm)             | Job Entry Subsystem Delays                |
| [OPD](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/opd.htm)             | OMVS Process Data                         |
| [PROC](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/erbb500170.htm)     | Processor Delays                          |
| [PROCU](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/procu.htm)         | Processor Usage                           |
| [STOR](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/erbb500196.htm)     | Storage Delays                            |
| [STORC](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/erbb500202.htm)    | Common Storage                            |
| [STORCR](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/erbb500208.htm)   | Common Storage Remaining                  |
| [SYSINFO](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/erbb500236.htm)  | System Information                        |
| [SYSSUM](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/mrsyps.htm)       | Sysplex Summary                           |
| [USAGE](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/m3usage00.htm)     | Monitor III Job Usage                     |

##### Request Format

To get a Monitor III report in ZEBRA format, make a `GET` request to:

```
GET /api/v2/rmf3/{lpar}/{report}
```

Parameters:

| Parameter    | Description                                                                      |
| ------------ | -------------------------------------------------------------------------------- |
| `lpar`       | Name of the reporting LPAR                                                       |
| `report`     | RMF Monitor III report type (see [list](#list-of-supported-monitor-iii-reports)) |

Query Options:

| Option       | Description                                                                                |
| ------------ | ------------------------------------------------------------------------------------------ |
| `resource`   | Specifies the resource to query for the reports (default is `mvsResource` from config)     |

##### Examples

| Request                                                            | Description                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `GET /api/v2/rmf3/DV01/CPC`                                        | Gets the most recent CPC Capacity report for DV01                                    |
| `GET /api/v2/rmf3/DV01/SYSINFO`                                    | Gets the most recent System Information report                                       |
| `GET /api/v2/rmf3/DV01/SYSSUM?resource=,VIPLEX,SYSPLEX`           | Gets the most recent Sysplex Summary from the `,VIPLEX,SYSPLEX` resource            |

**Response Format:**

```json
{
  "title": "CPC CAPACITY",
  "timestart": "2024-01-15 10:30:00",
  "timeend": "2024-01-15 10:31:00",
  "columnhead": ["Partition", "Type", "Weight", "..."],
  "table": [
    {"Partition": "DV01", "Type": "LPAR", "Weight": "100", "...": "..."},
    {"Partition": "QA01", "Type": "LPAR", "Weight": "50", "...": "..."}
  ],
  "caption": {
    "System": "DV01",
    "Date": "2024-01-15",
    "Time": "10:30:00"
  },
  "metadata": {
    "fetchedAt": "2024-01-15T10:31:00.000Z",
    "lpar": "DV01",
    "report": "CPC"
  }
}
```

### RMF Postprocessor (Monitor I) Reports

RMF Postprocessor reports offer historical records with longer intervals than RMF Monitor III.

##### List of Supported Postprocessor Reports

These report types are confirmed to be parsable by ZEBRA.

Each report links to its official IBM&copy; documentation.

| Report                                                                                                   | Description                               |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [CACHE](https://www.ibm.com/docs/en/zos/2.4.0?topic=postprocessor-cache-cache-subsystem-activity-report) | Cache Subsystem Activity                  |
| [CF](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/erbb500382.htm)                   | Coupling Facility Activity                |
| [CHAN](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/chan.htm)                       | Channel Path Activity                     |
| [CPU](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/cpu.htm)                         | CPU Activity                              |
| [CRYPTO](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/crypto.htm)                   | Crypto Hardware Activity                  |
| [DEVICE](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/device.htm)                   | Device Activity                           |
| [EADM](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/pp-eadm.htm)                    | Extended Asynchronous Data Mover Activity |
| [HFS](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/hfspp.htm)                       | Hierarchical File System Statistics       |
| [IOQ](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/ioq.htm)                         | I/O Queuing Activity                      |
| [OMVS](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/omvs.htm)                       | OMVS Kernel Activity                      |
| [PAGESP](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/pagesp.htm)                   | Page Data Set Activity                    |
| [PAGING](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/paging.htm)                   | Paging Activity                           |
| [SDELAY](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/sdelay.htm)                   | Serialization Delay                       |
| [VSTOR](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/vstor.htm)                     | Virtual Storage Activity                  |
| [WLMGL](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/wrkldac.htm)                   | Workload Activity                         |
| [XCF](https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.erbb500/xcf1.htm)                        | Cross-System Coupling Facility Activity   |

Additionally, you can append special parameters to the report as you would in the DDS. For example: `WLMGL(SCPER,RCLASS)` to breakdown the service classes by period and include report classes.

##### Request Format

To get a Postprocessor report in ZEBRA format, make a `GET` request to:

```
GET /api/v2/rmfpp/{lpar}/{report}
```

Parameters:

| Parameter    | Description                                                                          |
| ------------ | ------------------------------------------------------------------------------------ |
| `lpar`       | Name of the reporting LPAR                                                           |
| `report`     | RMF Postprocessor report type (see [list](#list-of-supported-postprocessor-reports)) |

Query Options:

| Option      | Description                                                                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startDate` | Start date for the report's interval (YYYY-MM-DD). If missing, defaults to current date. **Note:** If `startDate` is defined, `endDate` must be as well. |
| `endDate`   | End date for the report's interval (YYYY-MM-DD). If missing, defaults to current date. **Note:** If `endDate` is defined, `startDate` must be as well.   |

##### Examples

| Request                                                                        | Description                                                             |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `GET /api/v2/rmfpp/DV01/CPU`                                                   | Gets the CPU Activity reports for the current date                      |
| `GET /api/v2/rmfpp/DV01/CHAN?startDate=2024-01-09&endDate=2024-01-11`         | Gets Channel Path Activity reports from January 9-11, 2024              |
| `GET /api/v2/rmfpp/DV01/WLMGL`                                                 | Gets Workload Activity reports for the current date                     |
| `GET /api/v2/rmfpp/DV01/WLMGL(SCPER,RCLASS)`                                   | Gets Workload Activity with service class periods and report classes    |

### HMAI Ingestion API

HMAI (Hitachi Mainframe Analytics Interpreter) ingestion is controlled via REST API endpoints.

**Requirements:** Redis must be installed and running for HMAI features to work.

##### Available Endpoints

**Start Ingestion:**
```
POST /api/v2/hmai/{lpar}/ingestion/start
Body: {
  "metrics": ["clpr", "ldev", "mpb"],
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "continuousMonitoring": false
}
```

**Stop Ingestion:**
```
POST /api/v2/hmai/{lpar}/ingestion/stop
```

**Get Ingestion Status:**
```
GET /api/v2/hmai/{lpar}/ingestion/status
```

**Clear Database:**
```
POST /api/v2/hmai/{lpar}/clear-database
```

**Start All LPARs:**
```
POST /api/v2/hmai/ingestion/start-all
```

**Get Running Processes:**
```
GET /api/v2/hmai/running-processes
```

**Check Processed Data:**
```
POST /api/v2/hmai/{lpar}/check-processed
Body: {
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "metrics": ["clpr", "ldev"]
}
```

**Available Metrics:**
- `clpr` - Cache Logical Partition Resource
- `ldev` - Logical Device
- `mpb` - Microprocessor Board
- `mprank20` - Microprocessor Rank (Top 20)
- `pgrp` - Parity Group
- `port` - Port Statistics

**Web UI:** Access the HMAI interface at http://localhost:3000/hmai

### Exposing RMF Data to Prometheus

ZEBRA provides automatic Prometheus metrics scraping for RMF Monitor III data.

##### Metrics Endpoint

Prometheus should scrape:

```
GET /metrics
```

This endpoint returns metrics in Prometheus format based on the configuration in `config/metrics.json`.

##### Configuring Metrics

The `config/metrics.json` file defines which RMF metrics to expose to Prometheus:

```json
{
  "DV01_CPC_PHYSICAL_TOTAL": {
    "lpar": "DV01",
    "request": {
      "report": "CPC",
      "resource": ",DV01,MVS_IMAGE"
    },
    "identifiers": [
      {
        "key": "CPCPPNAM",
        "value": "DV01"
      }
    ],
    "field": "CPCPPTOU",
    "desc": "Physical total utilization for DV01 partition"
  }
}
```

Each metric definition includes:

| Field          | Description                                                                       |
| -------------- | --------------------------------------------------------------------------------- |
| `lpar`         | The name of the reporting LPAR                                                    |
| `request`      | Object containing the RMF Monitor III `report` type and optional `resource`       |
| `identifiers`  | Array of key-value pairs to filter specific entities (e.g., partition name)      |
| `field`        | The field whose value is used as the Prometheus metric                            |
| `desc`         | Optional description for the metric                                               |

**Auto-Scraping:**

ZEBRA automatically scrapes the configured metrics at the interval specified by `rmf3interval` in your configuration (default 100 seconds). Prometheus should scrape the `/metrics` endpoint at a slightly longer interval (120s recommended) to avoid missing data.

---

# Support

For any questions or help with any aspect of ZEBRA, you can contact the development team directly or open an [issue](https://github.com/zowe/zebra/issues) on GitHub. For Slack users, there is a channel for ZEBRA in the Open Mainframe Project&copy;'s [workspace](https://openmainframeproject.slack.com) that you can use to get in touch with the team and community! We greatly appreciate any feedback or suggestions!

| Name          | Role         | Contact                        |
| ------------- | ------------ | ------------------------------ |
| Alex Kim      | Project Lead | <alexkim@ibm.com>              |
| Salisu Ali    | Developer    | <salis7897@gmail.com>          |
| Justin Santer | Developer    | <justin.santer@convergetp.com> |

---

## About HMAI

As a prerequisite to using the HMAI plugin, the Hitachi Vantara software products Mainframe Analytics Recorder (MAR) and Hitachi Mainframe Analytics Interpreter (HMAI) must be installed on a mainframe LPAR connected to a Hitachi Vantara mainframe array.

HMAI converts MAR records in IBM z/OS® System Management Facilities (SMF) format to comma separated value (CSV) datasets. The CSV files contain key mainframe performance information for mainframe storage resources such as CLPR, MPB, Port, Parity Group, MPRank20 and LDEV.

The ZEBRA HMAI plugin includes components to automatically retrieve HMAI CSV files from an LPAR to the ZEBRA server using FTP and input the CSV files into a MySQL database. Grafana connects to the MySQL database as a Data Source and provides visualization of HMAI data using predefined dashboards.

For more information on MAR and HMAI, please view [Hitachi Mainframe Analytics Interpreter - FAQs](https://www.hitachivantara.com/en-us/insights/faq/mainframe-analytics-interpreter).

---

**Built with ❤️ by the Zowe community**
