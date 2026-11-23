-- MySQL dump 10.13  Distrib 9.7.4, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: suggestion_hub
-- ------------------------------------------------------
-- Server version	9.7.4

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '5a67b29d-da62-11f1-9c96-00155daf74c0:1-574';

--
-- Table structure for table `auth_group`
--

DROP TABLE IF EXISTS `auth_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group`
--

LOCK TABLES `auth_group` WRITE;
/*!40000 ALTER TABLE `auth_group` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_group_permissions`
--

DROP TABLE IF EXISTS `auth_group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group_permissions`
--

LOCK TABLES `auth_group_permissions` WRITE;
/*!40000 ALTER TABLE `auth_group_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_permission`
--

DROP TABLE IF EXISTS `auth_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_permission`
--

LOCK TABLES `auth_permission` WRITE;
/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` VALUES (1,'Can add log entry',1,'add_logentry'),(2,'Can change log entry',1,'change_logentry'),(3,'Can delete log entry',1,'delete_logentry'),(4,'Can view log entry',1,'view_logentry'),(5,'Can add permission',3,'add_permission'),(6,'Can change permission',3,'change_permission'),(7,'Can delete permission',3,'delete_permission'),(8,'Can view permission',3,'view_permission'),(9,'Can add group',2,'add_group'),(10,'Can change group',2,'change_group'),(11,'Can delete group',2,'delete_group'),(12,'Can view group',2,'view_group'),(13,'Can add user',4,'add_user'),(14,'Can change user',4,'change_user'),(15,'Can delete user',4,'delete_user'),(16,'Can view user',4,'view_user'),(17,'Can add content type',5,'add_contenttype'),(18,'Can change content type',5,'change_contenttype'),(19,'Can delete content type',5,'delete_contenttype'),(20,'Can view content type',5,'view_contenttype'),(21,'Can add session',6,'add_session'),(22,'Can change session',6,'change_session'),(23,'Can delete session',6,'delete_session'),(24,'Can view session',6,'view_session'),(25,'Can add course',7,'add_course'),(26,'Can change course',7,'change_course'),(27,'Can delete course',7,'delete_course'),(28,'Can view course',7,'view_course'),(29,'Can add department',8,'add_department'),(30,'Can change department',8,'change_department'),(31,'Can delete department',8,'delete_department'),(32,'Can view department',8,'view_department'),(33,'Can add follow',9,'add_follow'),(34,'Can change follow',9,'change_follow'),(35,'Can delete follow',9,'delete_follow'),(36,'Can view follow',9,'view_follow'),(37,'Can add App user',10,'add_hubuser'),(38,'Can change App user',10,'change_hubuser'),(39,'Can delete App user',10,'delete_hubuser'),(40,'Can view App user',10,'view_hubuser'),(41,'Can add note',11,'add_note'),(42,'Can change note',11,'change_note'),(43,'Can delete note',11,'delete_note'),(44,'Can view note',11,'view_note'),(45,'Can add notification',12,'add_notification'),(46,'Can change notification',12,'change_notification'),(47,'Can delete notification',12,'delete_notification'),(48,'Can view notification',12,'view_notification'),(49,'Can add rating',13,'add_rating'),(50,'Can change rating',13,'change_rating'),(51,'Can delete rating',13,'delete_rating'),(52,'Can view rating',13,'view_rating'),(53,'Can add report',14,'add_report'),(54,'Can change report',14,'change_report'),(55,'Can delete report',14,'delete_report'),(56,'Can view report',14,'view_report'),(57,'Can add review',15,'add_review'),(58,'Can change review',15,'change_review'),(59,'Can delete review',15,'delete_review'),(60,'Can view review',15,'view_review'),(61,'Can add teacher course',16,'add_teachercourse'),(62,'Can change teacher course',16,'change_teachercourse'),(63,'Can delete teacher course',16,'delete_teachercourse'),(64,'Can view teacher course',16,'view_teachercourse'),(65,'Can add comment',17,'add_comment'),(66,'Can change comment',17,'change_comment'),(67,'Can delete comment',17,'delete_comment'),(68,'Can view comment',17,'view_comment'),(69,'Can add note daily view',20,'add_notedailyview'),(70,'Can change note daily view',20,'change_notedailyview'),(71,'Can delete note daily view',20,'delete_notedailyview'),(72,'Can view note daily view',20,'view_notedailyview'),(73,'Can add rank title',19,'add_ranktitle'),(74,'Can change rank title',19,'change_ranktitle'),(75,'Can delete rank title',19,'delete_ranktitle'),(76,'Can view rank title',19,'view_ranktitle'),(77,'Can add user ranking',18,'add_userranking'),(78,'Can change user ranking',18,'change_userranking'),(79,'Can delete user ranking',18,'delete_userranking'),(80,'Can view user ranking',18,'view_userranking');
/*!40000 ALTER TABLE `auth_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_user`
--

DROP TABLE IF EXISTS `auth_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(150) NOT NULL,
  `first_name` varchar(150) NOT NULL,
  `last_name` varchar(150) NOT NULL,
  `email` varchar(254) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_user`
--

LOCK TABLES `auth_user` WRITE;
/*!40000 ALTER TABLE `auth_user` DISABLE KEYS */;
INSERT INTO `auth_user` VALUES (1,'pbkdf2_sha256$1500000$7ebLjkN8gUlmaxKWJLGjyf$Ur64iuZps6fPTnFgOiZnFJK/09n0EZP9v47NUpsIZyc=','2026-11-23 01:23:35.109687',1,'admin','','','prottoy.bubt@gmail.com',1,1,'2026-11-07 04:52:44.780678'),(2,'pbkdf2_sha256$1500000$xrcdlWVTywNFDcgPDeKJzP$E66gREnNeJDvQLN6sbIEIuMdgDvxpkGhSSjv59QRYFc=','2026-11-07 17:03:55.200216',0,'prottoy','Prottoy','Vhattacharyya','prottoy379@gmail.com',1,1,'2026-11-07 16:56:12.000000');
/*!40000 ALTER TABLE `auth_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_user_groups`
--

DROP TABLE IF EXISTS `auth_user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_user_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_user_groups_user_id_group_id_94350c0c_uniq` (`user_id`,`group_id`),
  KEY `auth_user_groups_group_id_97559544_fk_auth_group_id` (`group_id`),
  CONSTRAINT `auth_user_groups_group_id_97559544_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  CONSTRAINT `auth_user_groups_user_id_6a12ed8b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_user_groups`
--

LOCK TABLES `auth_user_groups` WRITE;
/*!40000 ALTER TABLE `auth_user_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_user_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_user_user_permissions`
--

DROP TABLE IF EXISTS `auth_user_user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_user_user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_user_user_permissions_user_id_permission_id_14a6b632_uniq` (`user_id`,`permission_id`),
  KEY `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_user_user_permissions`
--

LOCK TABLES `auth_user_user_permissions` WRITE;
/*!40000 ALTER TABLE `auth_user_user_permissions` DISABLE KEYS */;
INSERT INTO `auth_user_user_permissions` VALUES (1,2,41),(2,2,42),(3,2,43),(4,2,44),(5,2,49),(6,2,50),(7,2,51),(8,2,52),(9,2,53),(10,2,54),(11,2,55),(12,2,56),(13,2,57),(14,2,58),(15,2,59),(16,2,60);
/*!40000 ALTER TABLE `auth_user_user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `note_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comments_note` (`note_id`,`created_at`),
  KEY `fk_comments_user` (`user_id`),
  CONSTRAINT `fk_comments_note` FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comments`
--

LOCK TABLES `comments` WRITE;
/*!40000 ALTER TABLE `comments` DISABLE KEYS */;
INSERT INTO `comments` VALUES (1,1,1,'Good pdf','2026-11-13 07:54:10'),(2,1,1,'line 3 equation is genius','2026-11-13 08:01:09'),(3,11,1,'good','2026-11-13 08:09:06'),(4,12,3,'good video','2026-11-13 08:44:54'),(5,12,1,'Nice','2026-11-13 09:39:33'),(6,12,7,'Got 5 stars','2026-11-13 09:40:43'),(7,14,1,'hello','2026-11-23 08:15:23'),(8,5,7,'great helpe','2026-11-23 08:44:04');
/*!40000 ALTER TABLE `comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `title` varchar(200) NOT NULL,
  `department_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_courses_code` (`code`),
  KEY `idx_courses_department` (`department_id`),
  CONSTRAINT `fk_courses_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES (1,'CSE-101','Basic Programing',1),(2,'CSE-102','Basic Programming Lab',1),(3,'EEE-101','Basic Electronics',2),(4,'EEE-102','Basic Electronics Lab',2);
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `code` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_departments_code` (`code`),
  UNIQUE KEY `uq_departments_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,'Computer Science and Engineering','CSE'),(2,'Electrical and Electronics Engineering','EEE');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_admin_log`
--

DROP TABLE IF EXISTS `django_admin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint unsigned NOT NULL,
  `change_message` longtext NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_auth_user_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`),
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_admin_log`
--

LOCK TABLES `django_admin_log` WRITE;
/*!40000 ALTER TABLE `django_admin_log` DISABLE KEYS */;
INSERT INTO `django_admin_log` VALUES (1,'2026-11-07 05:26:57.187451','1','Department object (1)',1,'[{\"added\": {}}]',8,1),(2,'2026-11-07 05:27:14.835127','1','Department object (1)',2,'[]',8,1),(3,'2026-11-07 05:46:29.583280','1','Department object (1)',2,'[]',8,1),(4,'2026-11-07 05:47:32.049110','1','Course object (1)',1,'[{\"added\": {}}]',7,1),(5,'2026-11-07 05:51:48.217215','1','HubUser object (1)',2,'[{\"changed\": {\"fields\": [\"Password\"]}}]',10,1),(6,'2026-11-07 06:03:19.810481','1','Note object (1)',2,'[{\"changed\": {\"fields\": [\"Review status\", \"Approved at\"]}}]',11,1),(7,'2026-11-07 09:22:46.021426','2','Bubt-Assignment-Cover-page (CSE-101)',2,'[{\"changed\": {\"fields\": [\"Review status\", \"Approved at\"]}}]',11,1),(8,'2026-11-07 09:26:18.596806','2','Bubt-Assignment-Cover-page (CSE-101)',2,'[{\"changed\": {\"fields\": [\"Review status\"]}}]',11,1),(9,'2026-11-07 09:27:04.031629','2','Bubt-Assignment-Cover-page (CSE-101)',2,'[{\"changed\": {\"fields\": [\"Review status\"]}}]',11,1),(10,'2026-11-07 09:27:35.965307','1','Report object (1)',2,'[{\"changed\": {\"fields\": [\"Status\"]}}]',14,1),(11,'2026-11-07 09:47:05.288770','3','Ashiqur Rahman (ashiqashiqur@gmail.com)',2,'[{\"changed\": {\"fields\": [\"Is verified\", \"Created at\"]}}]',10,1),(12,'2026-11-07 09:47:17.861033','3','Ashiqur Rahman (ashiqashiqur@gmail.com)',2,'[{\"changed\": {\"fields\": [\"Is verified\"]}}]',10,1),(13,'2026-11-07 09:47:39.050663','3','Ashiqur Rahman (ashiqashiqur@gmail.com)',2,'[{\"changed\": {\"fields\": [\"Is verified\"]}}]',10,1),(14,'2026-11-07 10:01:03.818913','1','TeacherCourse object (1)',1,'[{\"added\": {}}]',16,1),(15,'2026-11-07 10:03:22.975278','2','CSE-102 - Basic Programming Lab',1,'[{\"added\": {}}]',7,1),(16,'2026-11-07 10:03:28.019011','2','TeacherCourse object (2)',1,'[{\"added\": {}}]',16,1),(17,'2026-11-07 10:09:21.467641','3','Ashiqur Rahman (ashiqashiqur@gmail.com)',2,'[{\"changed\": {\"fields\": [\"Is verified\"]}}]',10,1),(18,'2026-11-07 10:11:39.907507','3','Ashiqur Rahman (ashiqashiqur@gmail.com)',2,'[{\"changed\": {\"fields\": [\"Is verified\"]}}]',10,1),(19,'2026-11-07 10:11:52.957754','3','Ashiqur Rahman (ashiqashiqur@gmail.com)',2,'[]',10,1),(20,'2026-11-07 10:32:57.282484','1','Prottoy Vhattacharyya (prottoyvhattacharyya@gmail.com)',2,'[{\"changed\": {\"fields\": [\"Is active\"]}}]',10,1),(21,'2026-11-07 10:33:12.812504','1','Prottoy Vhattacharyya (prottoyvhattacharyya@gmail.com)',2,'[{\"changed\": {\"fields\": [\"Is active\"]}}]',10,1),(22,'2026-11-07 10:33:43.418360','3','Ashiqur Rahman (ashiqashiqur@gmail.com)',2,'[{\"changed\": {\"fields\": [\"Is verified\"]}}]',10,1),(23,'2026-11-07 10:34:06.048059','3','Ashiqur Rahman (ashiqashiqur@gmail.com)',2,'[{\"changed\": {\"fields\": [\"Is verified\"]}}]',10,1),(24,'2026-11-07 15:32:34.580535','2','EEE',1,'[{\"added\": {}}]',8,1),(25,'2026-11-07 15:34:28.601400','3','EEE-101 - Basic Electronics',1,'[{\"added\": {}}]',7,1),(26,'2026-11-07 15:35:32.287211','4','EEE-102 - Basic Electronics Lab',1,'[{\"added\": {}}]',7,1),(27,'2026-11-07 15:51:31.813816','1','Prottoy Vhattacharyya (prottoyvhattacharyya@gmail.com)',2,'[{\"changed\": {\"fields\": [\"Is active\"]}}]',10,1),(28,'2026-11-07 15:51:56.058509','1','Prottoy Vhattacharyya (prottoyvhattacharyya@gmail.com)',2,'[{\"changed\": {\"fields\": [\"Is active\"]}}]',10,1),(29,'2026-11-07 16:56:12.129807','2','prottoy',1,'[{\"added\": {}}]',4,1),(30,'2026-11-07 17:00:47.704376','2','prottoy',2,'[{\"changed\": {\"fields\": [\"First name\", \"Last name\", \"Email address\", \"User permissions\", \"Last login\"]}}]',4,1),(31,'2026-11-07 17:02:55.136702','2','prottoy',2,'[{\"changed\": {\"fields\": [\"password\"]}}]',4,1),(32,'2026-11-07 17:03:09.350984','2','prottoy',2,'[]',4,1),(33,'2026-11-07 17:03:38.980063','2','prottoy',2,'[{\"changed\": {\"fields\": [\"Staff status\"]}}]',4,1),(34,'2026-11-08 07:57:25.858165','1','TeacherCourse object (1)',3,'',16,1),(35,'2026-11-08 07:57:48.040205','3','TeacherCourse object (3)',1,'[{\"added\": {}}]',16,1),(36,'2026-11-08 08:16:48.220322','1','Review object (1)',1,'[{\"added\": {}}]',15,1),(37,'2026-11-08 11:19:10.452553','1','Prottoy\'s CV (CSE-101)',2,'[{\"changed\": {\"fields\": [\"Review status\"]}}]',11,1),(38,'2026-11-08 11:19:44.619472','2','Review object (2)',1,'[{\"added\": {}}]',15,1),(39,'2026-11-08 14:47:23.276873','1','Review object (1)',2,'[]',15,1),(40,'2026-11-08 14:47:55.261952','1','Review object (1)',2,'[{\"changed\": {\"fields\": [\"Decision\"]}}]',15,1),(41,'2026-11-08 14:48:26.596474','1','Review object (1)',2,'[]',15,1),(42,'2026-11-08 14:51:39.662773','3','Review object (3)',1,'[{\"added\": {}}]',15,1),(43,'2026-11-08 18:06:19.884016','3','Review object (3)',3,'',15,1),(44,'2026-11-08 18:06:19.884064','2','Review object (2)',3,'',15,1),(45,'2026-11-08 18:06:19.884081','1','Review object (1)',3,'',15,1),(46,'2026-11-08 18:07:03.638190','4','Review object (4)',1,'[{\"added\": {}}]',15,1),(47,'2026-11-08 18:07:45.245375','4','Review object (4)',2,'[{\"changed\": {\"fields\": [\"Decision\", \"Comment\"]}}]',15,1),(48,'2026-11-08 18:43:48.361054','5','Review object (5)',1,'[{\"added\": {}}]',15,1),(49,'2026-11-08 18:56:39.423195','6','Review object (6)',1,'[{\"added\": {}}]',15,1),(50,'2026-11-09 07:28:33.774638','6','Review object (6)',3,'',15,1),(51,'2026-11-09 07:28:33.774673','4','Review object (4)',3,'',15,1),(52,'2026-11-09 08:01:59.606556','7','Review object (7)',1,'[{\"added\": {}}]',15,1),(53,'2026-11-09 08:02:18.766207','8','Review object (8)',1,'[{\"added\": {}}]',15,1),(54,'2026-11-09 08:14:57.418635','8','Review object (8)',3,'',15,1),(55,'2026-11-09 08:15:32.124016','7','Review object (7)',3,'',15,1),(56,'2026-11-09 08:15:32.124045','5','Review object (5)',3,'',15,1),(57,'2026-11-10 08:52:45.790669','12','Review object (12)',2,'[{\"changed\": {\"fields\": [\"Decision\", \"Comment\", \"Created at\"]}}]',15,1),(58,'2026-11-10 08:53:27.719105','12','Review object (12)',2,'[{\"changed\": {\"fields\": [\"Decision\", \"Comment\", \"Created at\"]}}]',15,1),(59,'2026-11-12 23:33:15.686393','10','Meghdol (CSE-101)',3,'',11,1),(60,'2026-11-13 09:22:52.986549','7','Sanjid hossaiin Joy (joy@gmail.com)',2,'[{\"changed\": {\"fields\": [\"Is verified\"]}}]',10,1),(61,'2026-11-13 09:23:38.988770','4','TeacherCourse object (4)',1,'[{\"added\": {}}]',16,1),(62,'2026-11-13 09:23:46.613866','5','TeacherCourse object (5)',1,'[{\"added\": {}}]',16,1),(63,'2026-11-13 09:43:03.088754','12','Meghdol (CSE-102)',2,'[{\"changed\": {\"fields\": [\"Section\"]}}]',11,1),(64,'2026-11-23 01:13:28.209282','1','user 1: 62 (Legendary Grandmaster)',2,'[{\"changed\": {\"fields\": [\"Rank title\"]}}]',18,1),(65,'2026-11-23 01:13:48.312659','1','user 1: 62 (Pupil)',2,'[{\"changed\": {\"fields\": [\"Rank title\"]}}]',18,1),(66,'2026-11-23 02:38:06.734680','1','Prottoy Vhattacharyya (prottoyvhattacharyya@gmail.com)',2,'[{\"changed\": {\"fields\": [\"Is verified\"]}}]',10,1);
/*!40000 ALTER TABLE `django_admin_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_content_type`
--

DROP TABLE IF EXISTS `django_content_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_content_type`
--

LOCK TABLES `django_content_type` WRITE;
/*!40000 ALTER TABLE `django_content_type` DISABLE KEYS */;
INSERT INTO `django_content_type` VALUES (1,'admin','logentry'),(2,'auth','group'),(3,'auth','permission'),(4,'auth','user'),(5,'contenttypes','contenttype'),(17,'hub','comment'),(7,'hub','course'),(8,'hub','department'),(9,'hub','follow'),(10,'hub','hubuser'),(11,'hub','note'),(20,'hub','notedailyview'),(12,'hub','notification'),(13,'hub','rating'),(14,'hub','report'),(15,'hub','review'),(16,'hub','teachercourse'),(19,'rankings','ranktitle'),(18,'rankings','userranking'),(6,'sessions','session');
/*!40000 ALTER TABLE `django_content_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_migrations`
--

DROP TABLE IF EXISTS `django_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_migrations`
--

LOCK TABLES `django_migrations` WRITE;
/*!40000 ALTER TABLE `django_migrations` DISABLE KEYS */;
INSERT INTO `django_migrations` VALUES (1,'contenttypes','0001_initial','2026-11-07 04:51:43.874198'),(2,'auth','0001_initial','2026-11-07 04:51:44.967051'),(3,'admin','0001_initial','2026-11-07 04:51:45.198111'),(4,'admin','0002_logentry_remove_auto_add','2026-11-07 04:51:45.207448'),(5,'admin','0003_logentry_add_action_flag_choices','2026-11-07 04:51:45.216674'),(6,'contenttypes','0002_remove_content_type_name','2026-11-07 04:51:45.391126'),(7,'auth','0002_alter_permission_name_max_length','2026-11-07 04:51:45.492543'),(8,'auth','0003_alter_user_email_max_length','2026-11-07 04:51:45.519585'),(9,'auth','0004_alter_user_username_opts','2026-11-07 04:51:45.529607'),(10,'auth','0005_alter_user_last_login_null','2026-11-07 04:51:45.618176'),(11,'auth','0006_require_contenttypes_0002','2026-11-07 04:51:45.626007'),(12,'auth','0007_alter_validators_add_error_messages','2026-11-07 04:51:45.635145'),(13,'auth','0008_alter_user_username_max_length','2026-11-07 04:51:45.738965'),(14,'auth','0009_alter_user_last_name_max_length','2026-11-07 04:51:45.845760'),(15,'auth','0010_alter_group_name_max_length','2026-11-07 04:51:45.871442'),(16,'auth','0011_update_proxy_permissions','2026-11-07 04:51:45.886840'),(17,'auth','0012_alter_user_first_name_max_length','2026-11-07 04:51:46.000167'),(18,'sessions','0001_initial','2026-11-07 04:51:46.064522'),(19,'hub','0001_initial','2026-11-07 05:25:49.547725'),(20,'hub','0002_add_note_views','2026-11-23 02:39:22.160828'),(21,'hub','0003_add_user_avatar','2026-11-23 02:39:22.168416'),(22,'rankings','0001_initial','2026-11-23 02:39:22.176346');
/*!40000 ALTER TABLE `django_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_session`
--

DROP TABLE IF EXISTS `django_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_session`
--

LOCK TABLES `django_session` WRITE;
/*!40000 ALTER TABLE `django_session` DISABLE KEYS */;
INSERT INTO `django_session` VALUES ('0roqs428v69hbrh5r8noo2rma0j6d8f2','.eJxNjrsKwzAMRX-laA7FsdPFUz-hU9cgbLUx9SM4ciCE_Htt2kI3SedcdHcoC2XQOzgLuu-AAjoPGuacmNO2TsiMZsK8bXh9Nng2KUAHj-L9GDFQlW8f-XT_t6uTk2944WIpcj18p7E9AymkGnqhBiUqsjRj5vCjtYqLjK-Wv8gWJcMuxbbCcbwB6FU9Hg:1xRvfn:mYQAW3U7OkzdZhiqjJu0Qsr_OJKVXAiPtOq9614W9gc','2026-11-27 18:06:51.755939'),('1o547rp6jk6o6bb37gym9jdb159wmkjv','.eJwljTsOwyAMhq8SeUaVqm5MzQ36OEBkJU5AwibFMFRR7l6gyz98_-uAopTAHuAXsDcDxOgDWEB1_tOlpPvW4GWODAbWEsIkyFRD498fXugYpZophsYz4ezqrIGFdkyZSfLUDq6NqN8Es4_SF9RrRsnDI8WVVGNrEe8hfol6B8b3E87zB2aqOpc:1xPdkO:gtP8MMaRxoeHWcJRjTue7h_kb7CAQQ-nUXIMYHG73UI','2026-11-21 10:34:08.326670'),('3est7qcw8t47knfzf7gvynsddvxejdpm','.eJwljTsOwyAMhq8SeUaVqm5MzQ36OEBkJU5AwibFMFRR7l6gyz98_-uAopTAHuAXsDcDxOgDWEB1_tOlpPvW4GWODAbWEsIkyFRD498fXugYpZophsYz4ezqrIGFdkyZSfLUDq6NqN8Es4_SF9RrRsnDI8WVVGNrEe8hfol6B8b3E87zB2aqOpc:1xSaJF:9HBwK1eUji9ALj9kFmwwgt6YKYnSnI71P_U-Y2Huxfc','2026-11-29 13:30:17.162281'),('9uvuzx60cmihgao56cetkl3wr325ojai','.eJwlykEKgCAQBdCrxF8Hg1t3naH2MphRNGno2Ea6e1Hbx2uoJWTYhm2GNT2WKuIiHwEWw8XKuRuPtIduCkXRgz9zNcsbVtXTEknyLGsqSux9qlEL_Y0M4b4fpu0ilQ:1xVJWY:xrTuAumAwRbldVp_MeNLoV4JbP_8IUiwTlF3RFXNW-Q','2026-12-07 02:11:18.248895'),('a3y51wkt4w8g9o5srsbrekkmxw0kev1f','eyJ1c2VyIjp7ImlkIjoxLCJmdWxsX25hbWUiOiJBdmF0YXIgU21va2UgVGVzdCJ9fQ:1xVJVu:LNbj-4h8aCgNEq-1SBIiK5yZam17c-nMXJ3LpGNZM1Y','2026-12-07 02:10:38.600321'),('aqnojr48ql5jvq71r6pmwbvhf7kx70op','.eJw9jLsKAjEQRX9Fbr3IbqFFKv0AQVBsQ9iMEJw8SCY2y_67ia9u5pwzs6AWylALnIXaDSBvHEPhKT7pItVSkEOxactxNowB98qsg_HUotv1dN5cPlFTOXKn5Q--k-6_3_E4Tg1bSiaL_5lpgAtiHv12332hWVwMbT1iXV91aDVQ:1xRd8u:r5ZjicSG3vprxwIdVkHdqSgM5DArLGKgGDOtlQ7kvP4','2026-11-26 22:19:40.440188'),('axs3j3w2ppnic9re3d8vwxim2boo8761','.eJw1jL0KwjAUhV9Fzlyk7dAhkz6A4FBcS2iuELz5IbmpQ-m7m4hu53znZ0fJlKB2WAM1dSCnLUNhExfHSzbxzGHVjA7Pwrx47aimj_l2P83vUHEK3EiWYshLBT-1tMNvse_Hig1FncT9k6GD9aJfbTsNbUar2OCrveI4Pqb2MHE:1xRdOl:bOG61mGnAix6AAhlh5c1Qc2jiFcg2FgQ0m2EhVISkog','2026-11-26 22:36:03.641936'),('bn70x9omvyd5ni7hlw6w6ebj2rggchvy','.eJwlykEKhDAMBdCryF8LwW134hHmABI6FWXSRprUjXh3B12_d6JZqggnti_C0GNpInPhnBAwHuxcu0nzXpPZpqX7ZP0l9OCH5lbl_1b3PRCJRpZVzYlj1Fbc6G00EK7rBsAcJYc:1xVKGk:-QOMDxIBSfNhX4rLJjtFF_hnRcH2bL6hZuAA3u8CU1o','2026-12-07 02:59:02.510914'),('ee97p5tk0qh3bjr4f70i4l5eu6pky8cq','eyJ1c2VyIjp7ImlkIjoxLCJyb2xlIjoic3R1ZGVudCIsImZ1bGxfbmFtZSI6IlZpZXcgVGVzdCJ9fQ:1xVGK1:hMssugmdo44qX8U0onEuoE11m5yUmQw_K3vhvRiInNI','2026-12-06 22:46:09.224294'),('hnehzjsz0qoj5fsoqje925rwjixq9tn1','.eJwdjLEOgzAMRH8FeY46dKnERLeKqRIfgCwwYJTYKA5DhPj3Jt1O9-7dBadRhPYCnqF9OaCA7KGFXXO31vyYNICD5fR-FAxU2ICy89xsaobM0vSayyKqrzARTlu5dDDTgTEFkjTW82dtjFfBxCpl-TZjSyip-UZdyEyrReHwmon-DgyfHu77BzZ8OLA:1xRnUv:MzEOotH4fyIR6tx9p-RlcZj3GaiNoRWVz36Xb_jlqo0','2026-11-27 09:23:05.872713'),('ia3w60fhi3ospaetw165vnbvqhy4ujmo','.eJxNjrsKwzAMRX-laA7FsdPFUz-hU9cgbLUx9SM4ciCE_Htt2kI3SedcdHcoC2XQOzgLuu-AAjoPGuacmNO2TsiMZsK8bXh9Nng2KUAHj-L9GDFQlW8f-XT_t6uTk2944WIpcj18p7E9AymkGnqhBiUqsjRj5vCjtYqLjK-Wv8gWJcMuxbbCcbwB6FU9Hg:1xTXTY:j5A5BQlI-wrKhIiY0lgA_G32I7uuzWHjKWWQbdY75Zw','2026-12-02 04:40:52.202468'),('ka7h8jxi6m6jwoug6yd4v6kpd05qutmh','eyJ1c2VyIjp7ImlkIjoxLCJyb2xlIjoic3R1ZGVudCIsImZ1bGxfbmFtZSI6IlZpZXcgVGVzdCJ9fQ:1xVGKQ:SKLL3arU1xNoCQ9eCq8mk97PkwbI_54aOf-7HsGaEcI','2026-12-06 22:46:34.030272'),('n4hsbrueljoh6z38dlih7b5257h2197a','.eJwljsEKwjAQRH-l7LmY4kXJSW_iSegHlCVd25QkW7JboYj_bqK3YebNMG_YhDLYN_gR7KkFiugDWFh4v0xVHxxHaOG5hTAkjFSyHtPix2ZmEfQ-NXfeC5E51FAJ3VwmWxhpxayRkg51_Fgd8VNC9ZwKeRXxopi0eWR-kgjXFsU18E7060B_uxcPX6iYhy3XZ7Pqao0J7DCUC2rPXdcZdI63pGL-rDkZ-Hy-s65LxA:1xVKR9:cE8331LGgNWSJ06j1E1o8ZgtQ_m70APlz4hiYkmAXQQ','2026-12-07 03:09:47.648060'),('o4eg48hlfz8sgkj2yw22johqnm4nr4yy','.eJwlykEKgCAQBdCrxF8Hg1t3naH2MphRNGno2Ea6e1Hbx2uoJWTYhm2GNT2WKuIiHwEWw8XKuRuPtIduCkXRgz9zNcsbVtXTEknyLGsqSux9qlEL_Y0M4b4fpu0ilQ:1xVJX5:m1VsSXaVWB7piPAQIuUT7-nQ9aZMeVgA8dTYujdwtdI','2026-12-07 02:11:51.634178'),('osr60r6n59udgd48bxin1fi7tzytjwr7','.eJxVjMsOwiAURP-FtSFAebp07zeQC_cqVQNJaVfGf5cmXehucubMvFmEbS1x67TEGdmZSXb6ZQnyk-pe4APqvfHc6rrMie8KP9rOrw3pdTncv4MCvYx1nsilrLwXhPnmNGk7stJglE9WEwzg0FoIaXKYhRRgjHbKS-U8hsA-X-ZiN1Y:1xQiCT:I148fCWNcG_CfBApWY1XOfYHzVzX6fIJuRrgiZF0KJ4','2026-11-24 09:31:33.411900'),('pdjnbzhyng7d55xnkvqzpnn3ycz15ugc','.eJxNjrsKwzAMRX-laA7FsdPFUz-hU9cgbLUx9SM4ciCE_Htt2kI3SedcdHcoC2XQOzgLuu-AAjoPGuacmNO2TsiMZsK8bXh9Nng2KUAHj-L9GDFQlW8f-XT_t6uTk2944WIpcj18p7E9AymkGnqhBiUqsjRj5vCjtYqLjK-Wv8gWJcMuxbbCcbwB6FU9Hg:1xQpDd:JSCV6EIlMDbP2YDDpZhxUMSERSg85uSCVs7viS51BDI','2026-11-24 17:01:13.261267'),('q0qri2xtrqm5c5v6pqcexvz67zjgl64q','.eJwljTsOwyAMhq8SeUaVqm5MzQ36OEBkJU5AwibFMFRR7l6gyz98_-uAopTAHuAXsDcDxOgDWEB1_tOlpPvW4GWODAbWEsIkyFRD498fXugYpZophsYz4ezqrIGFdkyZSfLUDq6NqN8Es4_SF9RrRsnDI8WVVGNrEe8hfol6B8b3E87zB2aqOpc:1xRdD1:lHpsk0UaRNlksrY1UYqG8Cbc1CPtnhgiygMT8m-vf9Y','2026-11-26 22:23:55.425871'),('qa7q2li98tv83mse3im8kkvrxszhqadc','.eJwljTsOwyAMhq8SeUaVqm5MzQ36OEBkJU5AwibFMFRR7l6gyz98_-uAopTAHuAXsDcDxOgDWEB1_tOlpPvW4GWODAbWEsIkyFRD498fXugYpZophsYz4ezqrIGFdkyZSfLUDq6NqN8Es4_SF9RrRsnDI8WVVGNrEe8hfol6B8b3E87zB2aqOpc:1xTY8s:SBFtUP05JGMkRfN4eWIwn9MWpySiThcErY7ofEJEqdo','2026-12-02 05:23:34.773748'),('sff8f8rb6n1wa60538blf1wdt734tg9b','eyJ1c2VyIjp7ImlkIjoxLCJyb2xlIjoic3R1ZGVudCIsImZ1bGxfbmFtZSI6IlRlc3QgVXNlciJ9fQ:1xVIJX:7wzjxV4ofmV5bqu4r3A22iMRl_FIwyIkNy3U2QtT_TM','2026-12-07 00:53:47.942035'),('uyxnclfg7w0vren5m1p75l9cckm5puvw','.eJwljTsOwyAMhq8SeUaVqm5MzQ36OEBkJU5AwibFMFRR7l6gyz98_-uAopTAHuAXsDcDxOgDWEB1_tOlpPvW4GWODAbWEsIkyFRD498fXugYpZophsYz4ezqrIGFdkyZSfLUDq6NqN8Es4_SF9RrRsnDI8WVVGNrEe8hfol6B8b3E87zB2aqOpc:1xQJfZ:54ww9DpL5S0fpJSsB_TIbPmcsr7zJUWTEqG-uZN6bdE','2026-11-23 07:19:57.440423'),('w6pchebrtbvj62u6vo7ik8x3und54wh1','.eJxNjrsKwzAMRX-laA7FsdPFUz-hU9cgbLUx9SM4ciCE_Htt2kI3SedcdHcoC2XQOzgLuu-AAjoPGuacmNO2TsiMZsK8bXh9Nng2KUAHj-L9GDFQlW8f-XT_t6uTk2944WIpcj18p7E9AymkGnqhBiUqsjRj5vCjtYqLjK-Wv8gWJcMuxbbCcbwB6FU9Hg:1xRnHO:m7T4PZiD4qrDXQ5hpw6TC3dMkuwkxJ4RIK0akaRs5Yc','2026-11-27 09:09:06.578007'),('x6ppobmjj3m0flzawxgmisk09qpd73ie','eyJ1c2VyIjp7ImlkIjoyLCJyb2xlIjoic3R1ZGVudCIsImZ1bGxfbmFtZSI6IlZpZXcgVGVzdCJ9fQ:1xVGKQ:pCqjbcpmYEIvdoyZcvjbKg1pEMahVHvx9sjyIR04law','2026-12-06 22:46:34.938448'),('z2eqsc62tjwmvkpqt7v4lq7y26g17foa','.eJwljTsOwyAMhq8SeUaVqm5MzQ36OEBkJU5AwibFMFRR7l6gyz98_-uAopTAHuAXsDcDxOgDWEB1_tOlpPvW4GWODAbWEsIkyFRD498fXugYpZophsYz4ezqrIGFdkyZSfLUDq6NqN8Es4_SF9RrRsnDI8WVVGNrEe8hfol6B8b3E87zB2aqOpc:1xQotX:Nd4UxM9GR-CFiZWOTLxLbWyoF2pSIOBfKTJxm51FB_o','2026-11-24 16:40:27.588449'),('zjidtwoiewmbyklmi8vxaq30rqqr7ok9','.eJwljTsOwyAMhq8SeUaVqm5MzQ36OEBkJU5AwibFMFRR7l6gyz98_-uAopTAHuAXsDcDxOgDWEB1_tOlpPvW4GWODAbWEsIkyFRD498fXugYpZophsYz4ezqrIGFdkyZSfLUDq6NqN8Es4_SF9RrRsnDI8WVVGNrEe8hfol6B8b3E87zB2aqOpc:1xPdOz:nFzLv4qR7CNcNEHGyCcFnImdB2EzMuy2bl-718FDmIA','2026-11-21 10:12:01.151038');
/*!40000 ALTER TABLE `django_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `follows`
--

DROP TABLE IF EXISTS `follows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `follows` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `follower_id` int unsigned NOT NULL,
  `following_id` int unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_follows_pair` (`follower_id`,`following_id`),
  KEY `idx_follows_following` (`following_id`),
  CONSTRAINT `fk_follows_follower` FOREIGN KEY (`follower_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_follows_following` FOREIGN KEY (`following_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `follows`
--

LOCK TABLES `follows` WRITE;
/*!40000 ALTER TABLE `follows` DISABLE KEYS */;
INSERT INTO `follows` VALUES (6,3,1,'2026-11-10 01:35:54'),(7,2,1,'2026-11-10 14:56:43'),(11,3,2,'2026-11-18 11:23:41'),(13,1,3,'2026-11-18 11:31:17');
/*!40000 ALTER TABLE `follows` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_follows_no_self` BEFORE INSERT ON `follows` FOR EACH ROW BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A user cannot follow themselves';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `note_daily_views`
--

DROP TABLE IF EXISTS `note_daily_views`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `note_daily_views` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `note_id` int unsigned NOT NULL,
  `viewer_id` int unsigned NOT NULL,
  `view_date` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_note_daily_viewer_day` (`note_id`,`viewer_id`,`view_date`),
  KEY `idx_note_daily_note_date` (`note_id`,`view_date`),
  KEY `fk_note_daily_views_viewer` (`viewer_id`),
  CONSTRAINT `fk_note_daily_views_note` FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_note_daily_views_viewer` FOREIGN KEY (`viewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `note_daily_views`
--

LOCK TABLES `note_daily_views` WRITE;
/*!40000 ALTER TABLE `note_daily_views` DISABLE KEYS */;
INSERT INTO `note_daily_views` VALUES (1,5,1,'2026-11-23','2026-11-23 04:43:58'),(5,5,7,'2026-11-23','2026-11-23 08:43:37');
/*!40000 ALTER TABLE `note_daily_views` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notes`
--

DROP TABLE IF EXISTS `notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uploader_id` int unsigned NOT NULL,
  `course_id` int unsigned NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `type` enum('note','suggestion') NOT NULL DEFAULT 'note',
  `intake` varchar(10) NOT NULL,
  `section` varchar(10) DEFAULT NULL,
  `file` varchar(255) NOT NULL,
  `file_type` enum('pdf','video') NOT NULL DEFAULT 'pdf',
  `file_hash` char(64) NOT NULL,
  `page_count` int unsigned DEFAULT NULL,
  `ocr_used` tinyint(1) NOT NULL DEFAULT '0',
  `review_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `processing_status` enum('processing','ready','failed') NOT NULL DEFAULT 'processing',
  `rating_avg` decimal(3,2) NOT NULL DEFAULT '0.00',
  `rating_count` int unsigned NOT NULL DEFAULT '0',
  `view_count` int unsigned NOT NULL DEFAULT '0',
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notes_file_hash` (`file_hash`),
  KEY `idx_notes_course_intake_section` (`course_id`,`intake`,`section`),
  KEY `idx_notes_status_approved` (`review_status`,`approved_at`),
  KEY `idx_notes_uploader` (`uploader_id`,`review_status`),
  FULLTEXT KEY `ft_notes_title_desc` (`title`,`description`),
  CONSTRAINT `fk_notes_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_notes_uploader` FOREIGN KEY (`uploader_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notes`
--

LOCK TABLES `notes` WRITE;
/*!40000 ALTER TABLE `notes` DISABLE KEYS */;
INSERT INTO `notes` VALUES (1,1,1,'Prottoy\'s CV','Prottoy Vhattacharyya\'s Curriculum Vitae','note','52','5','uploaded_notes\\Prottoy_s_CV.pdf','pdf','48b5a7396ad7af062788bcb582cced659d48dbe6c9ec99b879083e272e21f829',NULL,0,'rejected','processing',0.00,0,0,NULL,'2026-11-07 11:54:52'),(2,2,1,'Bubt-Assignment-Cover-page','','note','52','5','uploaded_notes\\Bubt-Assignment-Cover-page.pdf','pdf','f33a59a0f7342b2fea393c798af328beadadabf12171f00323e976341ba6f999',NULL,0,'approved','processing',5.00,1,0,'2026-11-10 14:53:27','2026-11-07 15:20:32'),(3,1,2,'MongoDb_Notes','Mongo  DB Notes and Questions','note','52','5','uploaded_notes\\MongoDb_Notes.pdf','pdf','3823663065f196d34e528361dbdf20d49a309d4d9971d4f44dc34f6f40f2642c',NULL,0,'approved','processing',5.00,1,0,'2026-11-09 17:05:48','2026-11-09 00:55:17'),(4,1,3,'BCS questions','BCS','note','52','5','uploaded_notes\\question 1.pdf','pdf','ab5984f88df38a5d757a79d130eefcbbdde616586e23bf7a2aadc7ed093c00df',NULL,0,'rejected','processing',0.00,0,0,NULL,'2026-11-09 01:00:59'),(5,3,2,'lab cover page','lab cover','note','53','11','uploaded_notes\\lab cover page2.pdf','pdf','db503397c7fc3c61999c458cb1b3e48a9afdb47badc475b5d56086f44c85d65e',NULL,0,'approved','processing',3.00,2,2,'2026-11-10 00:33:04','2026-11-10 00:32:30'),(6,1,3,'capston application','capston application','note','53','6','uploaded_notes\\capston application.pdf','pdf','bb43d16758c65bc586651f08381d773727c11eeebe5a485a20151b3c0a3ee6f8',NULL,0,'pending','processing',0.00,0,0,NULL,'2026-11-10 00:48:07'),(7,1,2,'Data structure','Data structure Suggestion','suggestion','56','3','uploaded_notes\\capston section change.pdf','pdf','11f3f83d74388e14dcbf7ec480086450744f0e8171eeeeb288a41b83b82338f3',NULL,0,'pending','processing',0.00,0,0,NULL,'2026-11-10 22:41:50'),(11,1,2,'Blood report','','note','56','99','uploaded_notes/Gmail - screening report of NI-37939.pdf','pdf','a955d1fe2cad8382c159c73578807a0fbd7ffe554a2cbadedb4595695a89eb1e',NULL,0,'approved','processing',0.00,0,0,'2026-11-12 22:41:31','2026-11-12 22:40:50'),(12,1,2,'Meghdol','Meghdol _ Esho Amar Shohore','note','53','9','uploaded_notes/Meghdol _ Esho Amar Shohore _ Aluminium Er Dana _ Official Video.mp4','video','16ce930b70ce1bbd6349a57fe613817da9e77b76f255da3d40fcd95a5c0df0b5',NULL,0,'approved','processing',5.00,1,0,'2026-11-13 08:44:31','2026-11-12 23:33:22'),(13,1,3,'EEE pdf','best eee pd','note','58','2','uploaded_notes/Registration without previous due prottoy.pdf','pdf','87729967299f971500599bc09c8db809b69bd7c83a4b13be3d241f5d524a2317',NULL,0,'approved','processing',0.00,0,0,'2026-11-13 09:24:36','2026-11-13 09:20:09'),(14,1,2,'Template Registration without previous due','Template Registration without previous due','suggestion','48','1','uploaded_notes/Registration without previous due bappy.pdf','pdf','35ea736afdcb81ed6b56debb6bdb6afdabe2a60f694b324be1c5ad1e43e79bc2',NULL,0,'approved','processing',0.00,0,0,'2026-11-15 13:30:31','2026-11-15 13:29:29'),(15,1,1,'fighting','fight of dadu','note','54','99','uploaded_notes\\VID_20260307_234051.mp4','video','6a73360b5a57ced69726369cad141a57b59ae1abee398dfb2191bcc6ecfcdb10',NULL,0,'pending','processing',0.00,0,0,NULL,'2026-11-21 05:02:59'),(16,1,2,'dummy-1920x1080-250MB','','suggestion','52','99','uploaded_notes\\dummy-1920x1080-250MB.mp4','video','76db4f9b3350c849ec8ee7434b8502454ce0833abd78e016b80ec55601c18f79',NULL,0,'pending','processing',0.00,0,0,NULL,'2026-11-21 05:03:40'),(17,1,1,'sit in final xm basar','জীবের মধ্যে সবচেয়ে সম্পূর্ণতা মানুষের। কিন্তু সবচেয়ে অসম্পূর্ণ হয়ে সে জন্মগ্রহণ করে। বাঘ ভালুক তার জীবনযাত্রার পনেরো- আনা মূলধন নিয়ে আসে প্রকৃতির মালখানা থেকে। জীবরঙ্গভূমিতে মানুষ এসে দেখা দেয় দুই শূন্য হাতে মুঠো বেঁধে।\r\n   \r\n   মানুষ আসবার পূর্বেই জীবসৃষ্টিযজ্ঞে প্রকৃতির ভূরিব্যয়ের পালা শেষ হয়ে এসেছে। বিপুল মাংস, কঠিন বর্ম, প্রকাণ্ড লেজ নিয়ে জলে স্থলে পৃথুল দেহের যে অমিতাচার প্রবল হয়ে উঠেছিল তাতে ধরিত্রীকে দিলে ক্লান্ত করে। প্রমাণ হল আতিশয্যের পরাভব অনিবার্য। পরীক্ষায় এটাও স্থির হয়ে গেল যে, প্রশ্রয়ের পরিমাণ যত বেশি হয় দুর্বলতার বোঝাও তত দুর্বহ হয়ে ওঠে। নূতন পর্বে প্রকৃতি যথাসম্ভব মানুষের বরাদ্দ কম করে দিয়ে নিজে রইল নেপথ্যে।\r\n   \r\n   মানুষকে দেখতে হল খুব ছোটো, কিন্তু সেটা একটা কৌশল মাত্র। এবারকার জীবযাত্রার পালায় বিপুলতাকে করা হল বহুলতায় পরিণত। মহাকায় জন্তু ছিল প্রকাণ্ড একলা, মানুষ হল দূরপ্রসারিত অনেক।\r\nবাংলা ডেমো টেক্সট\r\nআমরা বাংলায় ওয়েব ডেডলপমেন্ট নিয়ে কাজ করতে গিয়ে প্রথম যে সমস্যাটার মুখোমুখি হই, সেটা হলো, বাংলা ডেমো টেক্সট। ইংরেজির জন্য lorem ipsum তো আছে । বাংলার জন্য কি আছে? সেই ধারনা থেকেই বাংলা ডেমো টেক্সট তৈরীর চেষ্টা। HTML এর প্রয়োজনীয় প্রায় সব ফরম্যাটেই বাংলা ডেমো টেক্সট তুলে ধরা হয়েছে। আশা করছি, এরি ক্ষুদ্র প্রচেষ্টা আপনাদের কাজে আসবে।','note','52','99','uploaded_notes\\sit in final xm basar.pdf','pdf','45460a3403efceb7ba47ceffd5bf988a49ba11eb226693183a8d46a1fbbf6edb',NULL,0,'pending','processing',0.00,0,0,NULL,'2026-11-21 07:24:47'),(26,7,1,'midadmit (joy)','','note','52','11','uploaded_notes\\midadmit (joy).pdf','pdf','d57d16f573cc0e18e722b6d2d0d6c7fb299d69173918db7dc60af75c8899a4c5',NULL,0,'pending','processing',0.00,0,0,NULL,'2026-11-23 09:07:58');
/*!40000 ALTER TABLE `notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `type` enum('new_pending_note','note_approved','note_rejected','followed_user_upload') NOT NULL,
  `note_id` int unsigned DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`,`is_read`,`created_at`),
  KEY `fk_notifications_note` (`note_id`),
  CONSTRAINT `fk_notifications_note` FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rank_titles`
--

DROP TABLE IF EXISTS `rank_titles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rank_titles` (
  `title` varchar(50) NOT NULL,
  `start_point` int unsigned NOT NULL,
  `end_point` int unsigned NOT NULL,
  PRIMARY KEY (`title`),
  UNIQUE KEY `uq_rank_titles_start` (`start_point`),
  UNIQUE KEY `uq_rank_titles_end` (`end_point`),
  CONSTRAINT `chk_rank_titles_range` CHECK ((`end_point` >= `start_point`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rank_titles`
--

LOCK TABLES `rank_titles` WRITE;
/*!40000 ALTER TABLE `rank_titles` DISABLE KEYS */;
INSERT INTO `rank_titles` VALUES ('Expert',150,349),('Grandmaster',700,1199),('Legendary Grandmaster',1200,4294967295),('Master',350,699),('Newbie',0,49),('Pupil',50,149);
/*!40000 ALTER TABLE `rank_titles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ratings`
--

DROP TABLE IF EXISTS `ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ratings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `note_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `stars` tinyint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ratings_note_user` (`note_id`,`user_id`),
  KEY `idx_ratings_user` (`user_id`),
  CONSTRAINT `fk_ratings_note` FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ratings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_ratings_stars` CHECK ((`stars` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ratings`
--

LOCK TABLES `ratings` WRITE;
/*!40000 ALTER TABLE `ratings` DISABLE KEYS */;
INSERT INTO `ratings` VALUES (1,2,1,5,'2026-11-07 15:24:03'),(7,3,2,5,'2026-11-10 14:56:22'),(8,5,1,2,'2026-11-10 21:37:11'),(12,12,7,5,'2026-11-13 09:40:28'),(14,5,7,4,'2026-11-23 08:43:43');
/*!40000 ALTER TABLE `ratings` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_ratings_no_self` BEFORE INSERT ON `ratings` FOR EACH ROW BEGIN
  IF NEW.user_id = (SELECT uploader_id FROM notes WHERE id = NEW.note_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A user cannot rate their own note';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `note_id` int unsigned NOT NULL,
  `reporter_id` int unsigned NOT NULL,
  `reason` text NOT NULL,
  `status` enum('open','resolved') NOT NULL DEFAULT 'open',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reports_status` (`status`,`created_at`),
  KEY `idx_reports_note` (`note_id`),
  KEY `fk_reports_reporter` (`reporter_id`),
  CONSTRAINT `fk_reports_note` FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reports_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reports`
--

LOCK TABLES `reports` WRITE;
/*!40000 ALTER TABLE `reports` DISABLE KEYS */;
INSERT INTO `reports` VALUES (1,2,1,'Wrong content — cover page does  not have assignment name','resolved','2026-11-07 15:25:42');
/*!40000 ALTER TABLE `reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `note_id` int unsigned NOT NULL,
  `teacher_id` int unsigned NOT NULL,
  `decision` enum('approved','rejected','pending') DEFAULT NULL,
  `comment` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reviews_note` (`note_id`),
  KEY `idx_reviews_teacher` (`teacher_id`,`created_at`),
  CONSTRAINT `fk_reviews_note` FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (9,3,3,'approved','Approved','2026-11-09 17:05:48'),(10,5,3,'approved','good','2026-11-10 00:33:04'),(11,1,3,'rejected','Reason for rejection: very very bad','2026-11-10 01:29:43'),(12,2,3,'approved','good','2026-11-10 08:53:25'),(14,11,3,'approved','very good','2026-11-12 22:41:31'),(15,12,3,'approved','','2026-11-13 08:44:31'),(16,13,7,'approved','good pdf','2026-11-13 09:24:36'),(17,4,7,'rejected','Reason for rejection: Not allowed any BCS','2026-11-13 09:29:10'),(18,14,3,'approved','','2026-11-15 13:30:31');
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_reviews_after_insert` AFTER INSERT ON `reviews` FOR EACH ROW BEGIN
  UPDATE notes
  SET review_status = NEW.decision,
      approved_at   = CASE WHEN NEW.decision = 'approved' THEN NOW() ELSE NULL END
  WHERE id = NEW.note_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_reviews_after_update` AFTER UPDATE ON `reviews` FOR EACH ROW BEGIN
  -- only react to a real change, and only if this is the note's latest review
  IF NEW.decision <> OLD.decision
     AND NEW.id = (SELECT MAX(r.id) FROM reviews r WHERE r.note_id = NEW.note_id) THEN
    UPDATE notes
    SET review_status = NEW.decision,
        approved_at   = CASE WHEN NEW.decision = 'approved' THEN NOW() ELSE NULL END
    WHERE id = NEW.note_id;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_reviews_after_delete` AFTER DELETE ON `reviews` FOR EACH ROW BEGIN
  UPDATE notes
  SET review_status = COALESCE(
        (SELECT r.decision FROM reviews r
         WHERE r.note_id = OLD.note_id ORDER BY r.id DESC LIMIT 1),
        'pending'),
      approved_at = CASE
        WHEN review_status = 'approved' THEN COALESCE(approved_at, NOW())
        ELSE NULL END
  WHERE id = OLD.note_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `teacher_courses`
--

DROP TABLE IF EXISTS `teacher_courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_courses` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `teacher_id` int unsigned NOT NULL,
  `course_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_teacher_course` (`teacher_id`,`course_id`),
  KEY `idx_tc_course` (`course_id`),
  CONSTRAINT `fk_tc_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tc_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teacher_courses`
--

LOCK TABLES `teacher_courses` WRITE;
/*!40000 ALTER TABLE `teacher_courses` DISABLE KEYS */;
INSERT INTO `teacher_courses` VALUES (3,3,1),(2,3,2),(4,7,3),(5,7,4);
/*!40000 ALTER TABLE `teacher_courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_rankings`
--

DROP TABLE IF EXISTS `user_rankings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_rankings` (
  `user_id` int unsigned NOT NULL,
  `points` int unsigned NOT NULL DEFAULT '0',
  `rank_title` varchar(50) NOT NULL DEFAULT 'Newbie',
  `approved_uploads` int unsigned NOT NULL DEFAULT '0',
  `ratings_received` int unsigned NOT NULL DEFAULT '0',
  `views_received` int unsigned NOT NULL DEFAULT '0',
  `followers` int unsigned NOT NULL DEFAULT '0',
  `comments_received` int unsigned NOT NULL DEFAULT '0',
  `completed_reviews` int unsigned NOT NULL DEFAULT '0',
  `is_ranked` tinyint(1) NOT NULL DEFAULT '1',
  `rank_global` int unsigned DEFAULT NULL,
  `rank_department` int unsigned DEFAULT NULL,
  `stats_updated_at` datetime DEFAULT NULL,
  `rank_updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `idx_user_rankings_points` (`points` DESC),
  KEY `idx_user_rankings_ranked_points` (`is_ranked`,`points` DESC),
  KEY `idx_user_rankings_title` (`rank_title`),
  KEY `idx_user_rankings_global_rank` (`rank_global`),
  KEY `idx_user_rankings_department_rank` (`rank_department`),
  CONSTRAINT `fk_user_rankings_title` FOREIGN KEY (`rank_title`) REFERENCES `rank_titles` (`title`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_user_rankings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_rankings`
--

LOCK TABLES `user_rankings` WRITE;
/*!40000 ALTER TABLE `user_rankings` DISABLE KEYS */;
INSERT INTO `user_rankings` VALUES (1,63,'Pupil',5,2,0,2,5,0,1,1,1,'2026-11-23 08:15:23','2026-11-23 09:07:58'),(2,14,'Newbie',1,1,0,1,0,0,1,2,2,'2026-11-23 06:53:13','2026-11-23 09:07:58'),(3,108,'Pupil',1,2,2,1,1,7,1,1,1,'2026-11-23 08:44:04','2026-11-23 09:07:58'),(4,0,'Newbie',0,0,0,0,0,0,1,3,1,'2026-11-23 06:53:13','2026-11-23 09:07:58'),(6,0,'Newbie',0,0,0,0,0,0,1,3,3,'2026-11-23 06:53:13','2026-11-23 09:07:58'),(7,30,'Newbie',0,0,0,0,0,2,1,2,1,'2026-11-23 09:07:58','2026-11-23 09:07:58');
/*!40000 ALTER TABLE `user_rankings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(254) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `role` enum('student','teacher','admin') NOT NULL DEFAULT 'student',
  `student_id` varchar(30) DEFAULT NULL,
  `department_id` int unsigned DEFAULT NULL,
  `intake` varchar(10) DEFAULT NULL,
  `section` varchar(10) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `employee_id` varchar(30) DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_student_id` (`student_id`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_dept_intake` (`department_id`,`intake`,`section`),
  CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'prottoyvhattacharyya@gmail.com','123','Prottoy Vhattacharyya',NULL,'student','20234103430',1,'52','5',NULL,NULL,1,1,'2026-11-07 11:28:05'),(2,'ibrahim@gmail.com','#Ibrahim123#','Ibrahim Khan Badsha',NULL,'student','20234103445',1,'52','5','','',0,1,'2026-11-07 11:59:46'),(3,'ashiqashiqur@gmail.com','#Ashiqur123#','Ashiqur Rahman',NULL,'teacher',NULL,1,NULL,NULL,'Assistant Professor','ASQ',1,1,'2026-11-07 15:40:11'),(4,'bappy@gmail.com','#Bappy123#','Sadik Mahmud Bappy',NULL,'student','20234103434',2,'53','11','','',0,1,'2026-11-10 00:41:00'),(6,'vtmp2@sdp.local','TmpPass123!','VTMP Two',NULL,'student','VTMP002',1,'61','A',NULL,NULL,0,1,'2026-11-12 22:36:03'),(7,'joy@gmail.com','#Joy123#','Sanjid hossaiin Joy','avatars/7.webp','teacher',NULL,2,NULL,NULL,'Assistant Professor','SHJ',1,1,'2026-11-13 09:21:53');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-23  9:12:12
