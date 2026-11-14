CREATE DATABASE  IF NOT EXISTS `bloodbankdb` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `bloodbankdb`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: bloodbankdb
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bloodbank`
--

DROP TABLE IF EXISTS `bloodbank`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bloodbank` (
  `bank_id` int NOT NULL AUTO_INCREMENT,
  `bank_name` varchar(100) NOT NULL,
  `address` varchar(200) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `contact_number` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`bank_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bloodbank`
--

LOCK TABLES `bloodbank` WRITE;
/*!40000 ALTER TABLE `bloodbank` DISABLE KEYS */;
INSERT INTO `bloodbank` VALUES (1,'Blood Bank Branch 1','Sector 1, Main Road','Pune','9100000001','bank1@example.com'),(2,'Blood Bank Branch 2','Sector 2, Main Road','Pune','9100000002','bank2@example.com'),(3,'Blood Bank Branch 3','Sector 3, Main Road','Pune','9100000003','bank3@example.com'),(4,'Blood Bank Branch 4','Sector 4, Main Road','Pune','9100000004','bank4@example.com'),(5,'Blood Bank Branch 5','Sector 5, Main Road','Pune','9100000005','bank5@example.com'),(6,'Blood Bank Branch 6','Sector 6, Main Road','Pune','9100000006','bank6@example.com'),(7,'Blood Bank Branch 7','Sector 7, Main Road','Pune','9100000007','bank7@example.com'),(8,'Blood Bank Branch 8','Sector 8, Main Road','Pune','9100000008','bank8@example.com'),(9,'Blood Bank Branch 9','Sector 9, Main Road','Pune','9100000009','bank9@example.com'),(10,'Blood Bank Branch 10','Sector 10, Main Road','Pune','9100000010','bank10@example.com'),(11,'Blood Bank Branch 11','Sector 11, Main Road','Pune','9100000011','bank11@example.com'),(12,'Blood Bank Branch 12','Sector 12, Main Road','Pune','9100000012','bank12@example.com'),(13,'Blood Bank Branch 13','Sector 13, Main Road','Pune','9100000013','bank13@example.com'),(14,'Blood Bank Branch 14','Sector 14, Main Road','Pune','9100000014','bank14@example.com'),(15,'Blood Bank Branch 15','Sector 15, Main Road','Pune','9100000015','bank15@example.com'),(16,'Blood Bank Branch 16','Sector 16, Main Road','Pune','9100000016','bank16@example.com'),(17,'Blood Bank Branch 17','Sector 17, Main Road','Pune','9100000017','bank17@example.com'),(18,'Blood Bank Branch 18','Sector 18, Main Road','Pune','9100000018','bank18@example.com'),(19,'Blood Bank Branch 19','Sector 19, Main Road','Pune','9100000019','bank19@example.com'),(20,'Blood Bank Branch 20','Sector 20, Main Road','Pune','9100000020','bank20@example.com');
/*!40000 ALTER TABLE `bloodbank` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bloodinventory`
--

DROP TABLE IF EXISTS `bloodinventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bloodinventory` (
  `inventory_id` int NOT NULL AUTO_INCREMENT,
  `donation_id` int NOT NULL,
  `bank_id` int NOT NULL,
  `blood_group` varchar(3) NOT NULL,
  `component_type` varchar(30) DEFAULT NULL,
  `units_available` int DEFAULT NULL,
  `collection_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  PRIMARY KEY (`inventory_id`),
  UNIQUE KEY `donation_id` (`donation_id`),
  KEY `bank_id` (`bank_id`),
  CONSTRAINT `bloodinventory_ibfk_1` FOREIGN KEY (`donation_id`) REFERENCES `donation` (`donation_id`),
  CONSTRAINT `bloodinventory_ibfk_2` FOREIGN KEY (`bank_id`) REFERENCES `bloodbank` (`bank_id`),
  CONSTRAINT `bloodinventory_chk_1` CHECK ((`units_available` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bloodinventory`
--

LOCK TABLES `bloodinventory` WRITE;
/*!40000 ALTER TABLE `bloodinventory` DISABLE KEYS */;
INSERT INTO `bloodinventory` VALUES (1,1,1,'A+','Whole Blood',1,'2026-11-13','2026-12-25'),(2,2,2,'A-','Whole Blood',1,'2026-11-12','2026-12-24'),(3,3,3,'B+','Whole Blood',1,'2026-11-11','2026-12-23'),(4,4,4,'B-','Whole Blood',1,'2026-11-10','2026-12-22'),(5,5,5,'AB+','Whole Blood',1,'2026-11-09','2026-12-21'),(6,6,6,'AB-','Whole Blood',1,'2026-11-08','2026-12-20'),(7,7,7,'O+','Whole Blood',1,'2026-11-07','2026-12-19'),(8,8,8,'O-','Whole Blood',1,'2026-11-06','2026-12-18'),(9,9,9,'A+','Whole Blood',1,'2026-11-05','2026-12-17'),(10,10,10,'A-','Whole Blood',1,'2026-11-04','2026-12-16'),(11,11,11,'B+','Whole Blood',1,'2026-11-03','2026-12-15'),(12,12,12,'B-','Whole Blood',1,'2026-11-02','2026-12-14'),(13,13,13,'AB+','Whole Blood',1,'2026-11-01','2026-12-13'),(14,14,14,'AB-','Whole Blood',1,'2026-10-31','2026-12-12'),(15,15,15,'O+','Whole Blood',1,'2026-10-30','2026-12-11'),(16,16,16,'O-','Whole Blood',1,'2026-10-29','2026-12-10'),(17,17,17,'A+','Whole Blood',1,'2026-10-28','2026-12-09'),(18,18,18,'A-','Whole Blood',1,'2026-10-27','2026-12-08'),(19,19,19,'B+','Whole Blood',1,'2026-10-26','2026-12-07'),(20,20,20,'B-','Whole Blood',1,'2026-10-25','2026-12-06');
/*!40000 ALTER TABLE `bloodinventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bloodissue`
--

DROP TABLE IF EXISTS `bloodissue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bloodissue` (
  `issue_id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `inventory_id` int NOT NULL,
  `staff_id` int NOT NULL,
  `issue_date` date DEFAULT NULL,
  `units_issued` int DEFAULT NULL,
  PRIMARY KEY (`issue_id`),
  KEY `request_id` (`request_id`),
  KEY `inventory_id` (`inventory_id`),
  KEY `staff_id` (`staff_id`),
  CONSTRAINT `bloodissue_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `bloodrequest` (`request_id`),
  CONSTRAINT `bloodissue_ibfk_2` FOREIGN KEY (`inventory_id`) REFERENCES `bloodinventory` (`inventory_id`),
  CONSTRAINT `bloodissue_ibfk_3` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `bloodissue_chk_1` CHECK ((`units_issued` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bloodissue`
--

LOCK TABLES `bloodissue` WRITE;
/*!40000 ALTER TABLE `bloodissue` DISABLE KEYS */;
INSERT INTO `bloodissue` VALUES (1,1,1,1,'2026-11-01',1),(2,2,2,2,'2026-11-02',1),(3,3,3,3,'2026-11-03',1),(4,4,4,4,'2026-11-04',1),(5,5,5,5,'2026-11-05',1),(6,6,6,6,'2026-11-06',1),(7,7,7,7,'2026-11-07',1),(8,8,8,8,'2026-11-08',1),(9,9,9,9,'2026-11-09',1),(10,10,10,10,'2026-11-10',1),(11,11,11,11,'2026-11-11',1),(12,12,12,12,'2026-11-12',1),(13,13,13,13,'2026-11-13',1),(14,14,14,14,'2026-11-14',1),(15,15,15,15,'2026-11-14',1),(16,16,16,16,'2026-11-14',1),(17,17,17,17,'2026-11-14',1),(18,18,18,18,'2026-11-14',1),(19,19,19,19,'2026-11-14',1),(20,20,20,20,'2026-11-14',1);
/*!40000 ALTER TABLE `bloodissue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bloodrequest`
--

DROP TABLE IF EXISTS `bloodrequest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bloodrequest` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `hospital_id` int NOT NULL,
  `blood_group` varchar(3) NOT NULL,
  `units_required` int DEFAULT NULL,
  `request_date` date DEFAULT NULL,
  `urgency` varchar(20) DEFAULT NULL,
  `request_status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  KEY `patient_id` (`patient_id`),
  KEY `hospital_id` (`hospital_id`),
  CONSTRAINT `bloodrequest_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`patient_id`),
  CONSTRAINT `bloodrequest_ibfk_2` FOREIGN KEY (`hospital_id`) REFERENCES `hospital` (`hospital_id`),
  CONSTRAINT `bloodrequest_chk_1` CHECK ((`units_required` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bloodrequest`
--

LOCK TABLES `bloodrequest` WRITE;
/*!40000 ALTER TABLE `bloodrequest` DISABLE KEYS */;
INSERT INTO `bloodrequest` VALUES (1,1,1,'A+',1,'2026-11-14','Normal','Pending'),(2,2,2,'A-',1,'2026-11-14','Normal','Pending'),(3,3,3,'B+',1,'2026-11-14','High','Pending'),(4,4,4,'B-',1,'2026-11-14','Normal','Pending'),(5,5,5,'AB+',1,'2026-11-14','Normal','Pending'),(6,6,6,'AB-',1,'2026-11-14','High','Pending'),(7,7,7,'O+',1,'2026-11-14','Normal','Pending'),(8,8,8,'O-',1,'2026-11-14','Normal','Pending'),(9,9,9,'A+',1,'2026-11-14','High','Pending'),(10,10,10,'A-',1,'2026-11-14','Normal','Pending'),(11,11,11,'B+',1,'2026-11-14','Normal','Pending'),(12,12,12,'B-',1,'2026-11-14','High','Pending'),(13,13,13,'AB+',1,'2026-11-14','Normal','Pending'),(14,14,14,'AB-',1,'2026-11-14','Normal','Pending'),(15,15,15,'O+',1,'2026-11-14','High','Pending'),(16,16,16,'O-',1,'2026-11-14','Normal','Pending'),(17,17,17,'A+',1,'2026-11-14','Normal','Pending'),(18,18,18,'A-',1,'2026-11-14','High','Pending'),(19,19,19,'B+',1,'2026-11-14','Normal','Pending'),(20,20,20,'B-',1,'2026-11-14','Normal','Pending');
/*!40000 ALTER TABLE `bloodrequest` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bloodtest`
--

DROP TABLE IF EXISTS `bloodtest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bloodtest` (
  `test_id` int NOT NULL AUTO_INCREMENT,
  `donation_id` int NOT NULL,
  `test_date` date DEFAULT NULL,
  `hiv_result` varchar(20) DEFAULT NULL,
  `hepatitis_result` varchar(20) DEFAULT NULL,
  `malaria_result` varchar(20) DEFAULT NULL,
  `overall_status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`test_id`),
  UNIQUE KEY `donation_id` (`donation_id`),
  CONSTRAINT `bloodtest_ibfk_1` FOREIGN KEY (`donation_id`) REFERENCES `donation` (`donation_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bloodtest`
--

LOCK TABLES `bloodtest` WRITE;
/*!40000 ALTER TABLE `bloodtest` DISABLE KEYS */;
INSERT INTO `bloodtest` VALUES (1,1,'2026-11-14','Negative','Negative','Negative','Safe'),(2,2,'2026-11-13','Negative','Negative','Negative','Safe'),(3,3,'2026-11-12','Negative','Negative','Negative','Safe'),(4,4,'2026-11-11','Negative','Negative','Negative','Safe'),(5,5,'2026-11-10','Negative','Negative','Negative','Safe'),(6,6,'2026-11-09','Negative','Negative','Negative','Safe'),(7,7,'2026-11-08','Negative','Negative','Negative','Safe'),(8,8,'2026-11-07','Negative','Negative','Negative','Safe'),(9,9,'2026-11-06','Negative','Negative','Negative','Safe'),(10,10,'2026-11-05','Negative','Negative','Negative','Safe'),(11,11,'2026-11-04','Negative','Negative','Negative','Safe'),(12,12,'2026-11-03','Negative','Negative','Negative','Safe'),(13,13,'2026-11-02','Negative','Negative','Negative','Safe'),(14,14,'2026-11-01','Negative','Negative','Negative','Safe'),(15,15,'2026-10-31','Negative','Negative','Negative','Safe'),(16,16,'2026-10-30','Negative','Negative','Negative','Safe'),(17,17,'2026-10-29','Negative','Negative','Negative','Safe'),(18,18,'2026-10-28','Negative','Negative','Negative','Safe'),(19,19,'2026-10-27','Negative','Negative','Negative','Safe'),(20,20,'2026-10-26','Negative','Negative','Negative','Safe');
/*!40000 ALTER TABLE `bloodtest` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donation`
--

DROP TABLE IF EXISTS `donation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donation` (
  `donation_id` int NOT NULL AUTO_INCREMENT,
  `donor_id` int NOT NULL,
  `bank_id` int NOT NULL,
  `staff_id` int NOT NULL,
  `donation_date` date NOT NULL,
  `quantity_ml` int DEFAULT NULL,
  `donation_status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`donation_id`),
  KEY `donor_id` (`donor_id`),
  KEY `bank_id` (`bank_id`),
  KEY `staff_id` (`staff_id`),
  CONSTRAINT `donation_ibfk_1` FOREIGN KEY (`donor_id`) REFERENCES `donor` (`donor_id`),
  CONSTRAINT `donation_ibfk_2` FOREIGN KEY (`bank_id`) REFERENCES `bloodbank` (`bank_id`),
  CONSTRAINT `donation_ibfk_3` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `donation_chk_1` CHECK ((`quantity_ml` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donation`
--

LOCK TABLES `donation` WRITE;
/*!40000 ALTER TABLE `donation` DISABLE KEYS */;
INSERT INTO `donation` VALUES (1,1,1,1,'2026-11-13',450,'Accepted'),(2,2,2,2,'2026-11-12',450,'Accepted'),(3,3,3,3,'2026-11-11',450,'Accepted'),(4,4,4,4,'2026-11-10',450,'Accepted'),(5,5,5,5,'2026-11-09',450,'Accepted'),(6,6,6,6,'2026-11-08',450,'Accepted'),(7,7,7,7,'2026-11-07',450,'Accepted'),(8,8,8,8,'2026-11-06',450,'Accepted'),(9,9,9,9,'2026-11-05',450,'Accepted'),(10,10,10,10,'2026-11-04',450,'Accepted'),(11,11,11,11,'2026-11-03',450,'Accepted'),(12,12,12,12,'2026-11-02',450,'Accepted'),(13,13,13,13,'2026-11-01',450,'Accepted'),(14,14,14,14,'2026-10-31',450,'Accepted'),(15,15,15,15,'2026-10-30',450,'Accepted'),(16,16,16,16,'2026-10-29',450,'Accepted'),(17,17,17,17,'2026-10-28',450,'Accepted'),(18,18,18,18,'2026-10-27',450,'Accepted'),(19,19,19,19,'2026-10-26',450,'Accepted'),(20,20,20,20,'2026-10-25',450,'Accepted');
/*!40000 ALTER TABLE `donation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donor`
--

DROP TABLE IF EXISTS `donor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donor` (
  `donor_id` int NOT NULL AUTO_INCREMENT,
  `donor_name` varchar(100) NOT NULL,
  `age` int DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `blood_group` varchar(3) NOT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `last_donation_date` date DEFAULT NULL,
  PRIMARY KEY (`donor_id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `email` (`email`),
  CONSTRAINT `donor_chk_1` CHECK (((`age` >= 18) and (`age` <= 65))),
  CONSTRAINT `donor_chk_2` CHECK ((`blood_group` in (_utf8mb4'A+',_utf8mb4'A-',_utf8mb4'B+',_utf8mb4'B-',_utf8mb4'AB+',_utf8mb4'AB-',_utf8mb4'O+',_utf8mb4'O-')))
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donor`
--

LOCK TABLES `donor` WRITE;
/*!40000 ALTER TABLE `donor` DISABLE KEYS */;
INSERT INTO `donor` VALUES (1,'Donor 1',22,'Male','A+','9800000001','donor1@example.com','Pune','2026-11-13'),(2,'Donor 2',24,'Female','A-','9800000002','donor2@example.com','Pune','2026-11-12'),(3,'Donor 3',26,'Male','B+','9800000003','donor3@example.com','Pune','2026-11-11'),(4,'Donor 4',28,'Female','B-','9800000004','donor4@example.com','Pune','2026-11-10'),(5,'Donor 5',30,'Male','AB+','9800000005','donor5@example.com','Pune','2026-11-09'),(6,'Donor 6',32,'Female','AB-','9800000006','donor6@example.com','Pune','2026-11-08'),(7,'Donor 7',34,'Male','O+','9800000007','donor7@example.com','Pune','2026-11-07'),(8,'Donor 8',36,'Female','O-','9800000008','donor8@example.com','Pune','2026-11-06'),(9,'Donor 9',38,'Male','A+','9800000009','donor9@example.com','Pune','2026-11-05'),(10,'Donor 10',40,'Female','A-','9800000010','donor10@example.com','Pune','2026-11-04'),(11,'Donor 11',42,'Male','B+','9800000011','donor11@example.com','Pune','2026-11-03'),(12,'Donor 12',44,'Female','B-','9800000012','donor12@example.com','Pune','2026-11-02'),(13,'Donor 13',46,'Male','AB+','9800000013','donor13@example.com','Pune','2026-11-01'),(14,'Donor 14',48,'Female','AB-','9800000014','donor14@example.com','Pune','2026-10-31'),(15,'Donor 15',50,'Male','O+','9800000015','donor15@example.com','Pune','2026-10-30'),(16,'Donor 16',52,'Female','O-','9800000016','donor16@example.com','Pune','2026-10-29'),(17,'Donor 17',54,'Male','A+','9800000017','donor17@example.com','Pune','2026-10-28'),(18,'Donor 18',56,'Female','A-','9800000018','donor18@example.com','Pune','2026-10-27'),(19,'Donor 19',58,'Male','B+','9800000019','donor19@example.com','Pune','2026-10-26'),(20,'Donor 20',20,'Female','B-','9800000020','donor20@example.com','Pune','2026-10-25');
/*!40000 ALTER TABLE `donor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hospital`
--

DROP TABLE IF EXISTS `hospital`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hospital` (
  `hospital_id` int NOT NULL AUTO_INCREMENT,
  `hospital_name` varchar(100) NOT NULL,
  `address` varchar(200) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `contact_number` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`hospital_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hospital`
--

LOCK TABLES `hospital` WRITE;
/*!40000 ALTER TABLE `hospital` DISABLE KEYS */;
INSERT INTO `hospital` VALUES (1,'Hospital 1','Hospital Road, Area 1','Pune','9600000001','hospital1@example.com'),(2,'Hospital 2','Hospital Road, Area 2','Pune','9600000002','hospital2@example.com'),(3,'Hospital 3','Hospital Road, Area 3','Pune','9600000003','hospital3@example.com'),(4,'Hospital 4','Hospital Road, Area 4','Pune','9600000004','hospital4@example.com'),(5,'Hospital 5','Hospital Road, Area 5','Pune','9600000005','hospital5@example.com'),(6,'Hospital 6','Hospital Road, Area 6','Pune','9600000006','hospital6@example.com'),(7,'Hospital 7','Hospital Road, Area 7','Pune','9600000007','hospital7@example.com'),(8,'Hospital 8','Hospital Road, Area 8','Pune','9600000008','hospital8@example.com'),(9,'Hospital 9','Hospital Road, Area 9','Pune','9600000009','hospital9@example.com'),(10,'Hospital 10','Hospital Road, Area 10','Pune','9600000010','hospital10@example.com'),(11,'Hospital 11','Hospital Road, Area 11','Pune','9600000011','hospital11@example.com'),(12,'Hospital 12','Hospital Road, Area 12','Pune','9600000012','hospital12@example.com'),(13,'Hospital 13','Hospital Road, Area 13','Pune','9600000013','hospital13@example.com'),(14,'Hospital 14','Hospital Road, Area 14','Pune','9600000014','hospital14@example.com'),(15,'Hospital 15','Hospital Road, Area 15','Pune','9600000015','hospital15@example.com'),(16,'Hospital 16','Hospital Road, Area 16','Pune','9600000016','hospital16@example.com'),(17,'Hospital 17','Hospital Road, Area 17','Pune','9600000017','hospital17@example.com'),(18,'Hospital 18','Hospital Road, Area 18','Pune','9600000018','hospital18@example.com'),(19,'Hospital 19','Hospital Road, Area 19','Pune','9600000019','hospital19@example.com'),(20,'Hospital 20','Hospital Road, Area 20','Pune','9600000020','hospital20@example.com');
/*!40000 ALTER TABLE `hospital` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patient`
--

DROP TABLE IF EXISTS `patient`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient` (
  `patient_id` int NOT NULL AUTO_INCREMENT,
  `patient_name` varchar(100) NOT NULL,
  `age` int DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `blood_group` varchar(3) NOT NULL,
  `contact_number` varchar(15) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`patient_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patient`
--

LOCK TABLES `patient` WRITE;
/*!40000 ALTER TABLE `patient` DISABLE KEYS */;
INSERT INTO `patient` VALUES (1,'Patient 1',21,'Female','A+','9700000001','Pune'),(2,'Patient 2',24,'Male','A-','9700000002','Pune'),(3,'Patient 3',27,'Female','B+','9700000003','Pune'),(4,'Patient 4',30,'Male','B-','9700000004','Pune'),(5,'Patient 5',33,'Female','AB+','9700000005','Pune'),(6,'Patient 6',36,'Male','AB-','9700000006','Pune'),(7,'Patient 7',39,'Female','O+','9700000007','Pune'),(8,'Patient 8',42,'Male','O-','9700000008','Pune'),(9,'Patient 9',45,'Female','A+','9700000009','Pune'),(10,'Patient 10',48,'Male','A-','9700000010','Pune'),(11,'Patient 11',51,'Female','B+','9700000011','Pune'),(12,'Patient 12',54,'Male','B-','9700000012','Pune'),(13,'Patient 13',57,'Female','AB+','9700000013','Pune'),(14,'Patient 14',60,'Male','AB-','9700000014','Pune'),(15,'Patient 15',18,'Female','O+','9700000015','Pune'),(16,'Patient 16',21,'Male','O-','9700000016','Pune'),(17,'Patient 17',24,'Female','A+','9700000017','Pune'),(18,'Patient 18',27,'Male','A-','9700000018','Pune'),(19,'Patient 19',30,'Female','B+','9700000019','Pune'),(20,'Patient 20',33,'Male','B-','9700000020','Pune');
/*!40000 ALTER TABLE `patient` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff` (
  `staff_id` int NOT NULL AUTO_INCREMENT,
  `staff_name` varchar(100) NOT NULL,
  `designation` varchar(50) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `bank_id` int DEFAULT NULL,
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `email` (`email`),
  KEY `bank_id` (`bank_id`),
  CONSTRAINT `staff_ibfk_1` FOREIGN KEY (`bank_id`) REFERENCES `bloodbank` (`bank_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
INSERT INTO `staff` VALUES (1,'Staff Member 1','Manager','9500000001','staff1@example.com',1),(2,'Staff Member 2','Technician','9500000002','staff2@example.com',2),(3,'Staff Member 3','Manager','9500000003','staff3@example.com',3),(4,'Staff Member 4','Technician','9500000004','staff4@example.com',4),(5,'Staff Member 5','Manager','9500000005','staff5@example.com',5),(6,'Staff Member 6','Technician','9500000006','staff6@example.com',6),(7,'Staff Member 7','Manager','9500000007','staff7@example.com',7),(8,'Staff Member 8','Technician','9500000008','staff8@example.com',8),(9,'Staff Member 9','Manager','9500000009','staff9@example.com',9),(10,'Staff Member 10','Technician','9500000010','staff10@example.com',10),(11,'Staff Member 11','Manager','9500000011','staff11@example.com',11),(12,'Staff Member 12','Technician','9500000012','staff12@example.com',12),(13,'Staff Member 13','Manager','9500000013','staff13@example.com',13),(14,'Staff Member 14','Technician','9500000014','staff14@example.com',14),(15,'Staff Member 15','Manager','9500000015','staff15@example.com',15),(16,'Staff Member 16','Technician','9500000016','staff16@example.com',16),(17,'Staff Member 17','Manager','9500000017','staff17@example.com',17),(18,'Staff Member 18','Technician','9500000018','staff18@example.com',18),(19,'Staff Member 19','Manager','9500000019','staff19@example.com',19),(20,'Staff Member 20','Technician','9500000020','staff20@example.com',20);
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-14 16:34:08
