import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import dns from "dns";

dotenv.config();

// ======================================================
// DNS
// ======================================================

dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);

// ======================================================
// APP CONFIG
// ======================================================

const app = express();
const PORT = 5000;

// ======================================================
// MONGODB
// ======================================================

if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing in .env file.");
    process.exit(1);
}

const client = new MongoClient(
    process.env.MONGODB_URI
);

let db;
let usersCollection;
let adminCollection;
let pickupCollection;
let collectionPointsCollection;

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

// ======================================================
// UPLOAD FOLDER
// ======================================================

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

app.use(
    "/uploads",
    express.static("uploads")
);

// ======================================================
// MULTER
// ======================================================

const upload = multer({
    dest: "uploads/"
});

// ======================================================
// TEST SERVER
// ======================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "EcoCollect backend is running successfully!"
    });
});

// ======================================================
// USER SIGNUP
// ======================================================

app.post(
    "/api/signup",
    async (req, res) => {

        try {

            const {
                name,
                email,
                phone,
                password
            } = req.body;

            console.log("");
            console.log("================================");
            console.log("NEW USER SIGNUP");
            console.log("================================");

            if (
                !name ||
                !email ||
                !phone ||
                !password
            ) {

                return res.status(400).json({
                    success: false,
                    message: "All fields are required."
                });
            }

            const cleanEmail =
                email
                    .toLowerCase()
                    .trim();

            // Check existing user

            const existingUser =
                await usersCollection.findOne({
                    email: cleanEmail
                });

            if (existingUser) {

                return res.status(409).json({
                    success: false,
                    message: "Email already registered."
                });
            }

            // Hash password

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            // Create user

            const newUser = {

                name: name.trim(),

                email: cleanEmail,

                phone: phone.trim(),

                password: hashedPassword,

                createdAt: new Date()
            };

            const result =
                await usersCollection.insertOne(
                    newUser
                );

            console.log(
                "User created:",
                result.insertedId
            );

            res.status(201).json({

                success: true,

                message:
                    "Account created successfully.",

                userId:
                    result.insertedId
            });

        } catch (error) {

            console.error(
                "SIGNUP ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to create account.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// USER LOGIN
// ======================================================

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;

            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and password are required."
                });
            }

            const cleanEmail =
                email
                    .toLowerCase()
                    .trim();

            const user =
                await usersCollection.findOne({
                    email: cleanEmail
                });

            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Wrong email or password."
                });
            }

            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!passwordMatch) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Wrong email or password."
                });
            }

            console.log(
                "User login successful:",
                cleanEmail
            );

            res.json({

                success: true,

                message:
                    "Login successful.",

                user: {

                    id: user._id,

                    name: user.name || "User",

                    email: user.email,

                    phone: user.phone || ""
                }
            });

        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Server error during login.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// GET USER BY ID
// ======================================================

app.get(
    "/api/users/:id",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            if (!ObjectId.isValid(id)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."
                });
            }

            const user =
                await usersCollection.findOne(
                    {
                        _id:
                            new ObjectId(id)
                    },
                    {
                        projection: {
                            password: 0
                        }
                    }
                );

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."
                });
            }

            res.json({

                success: true,

                user: user
            });

        } catch (error) {

            console.error(
                "GET USER ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to get user.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// UPDATE USER PROFILE
// ======================================================

app.put(
    "/api/users/:id",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            const {
                name,
                phone
            } = req.body;

            console.log("");
            console.log("================================");
            console.log("UPDATE USER PROFILE");
            console.log("================================");

            console.log(
                "User ID:",
                id
            );

            console.log(
                "Name:",
                name
            );

            console.log(
                "Phone:",
                phone
            );

            // Check ID

            if (!ObjectId.isValid(id)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."
                });
            }

            // Check fields

            if (
                !name ||
                !phone
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Name and phone are required."
                });
            }

            // Update

            const result =
                await usersCollection.updateOne(

                    {
                        _id:
                            new ObjectId(id)
                    },

                    {
                        $set: {

                            name:
                                name.trim(),

                            phone:
                                phone.trim(),

                            updatedAt:
                                new Date()
                        }
                    }
                );

            if (
                result.matchedCount === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."
                });
            }

            // Get updated user

            const updatedUser =
                await usersCollection.findOne(

                    {
                        _id:
                            new ObjectId(id)
                    },

                    {
                        projection: {
                            password: 0
                        }
                    }
                );

            console.log(
                "Profile updated successfully."
            );

            res.json({

                success: true,

                message:
                    "Profile updated successfully.",

                user:
                    updatedUser
            });

        } catch (error) {

            console.error(
                "UPDATE USER ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to update profile.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// CHANGE USER PASSWORD
// ======================================================

app.put(
    "/api/users/:id/password",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            const {
                currentPassword,
                newPassword
            } = req.body;

            console.log("");
            console.log("================================");
            console.log("CHANGE USER PASSWORD");
            console.log("================================");

            console.log(
                "User ID:",
                id
            );

            // Check ID

            if (!ObjectId.isValid(id)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."
                });
            }

            // Check fields

            if (
                !currentPassword ||
                !newPassword
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Current password and new password are required."
                });
            }

            // Minimum password length

            if (newPassword.length < 6) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New password must be at least 6 characters."
                });
            }

            // Find user

            const user =
                await usersCollection.findOne({

                    _id:
                        new ObjectId(id)
                });

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."
                });
            }

            // Check current password

            const passwordMatch =
                await bcrypt.compare(

                    currentPassword,

                    user.password
                );

            if (!passwordMatch) {

                console.log(
                    "Current password is incorrect."
                );

                return res.status(401).json({

                    success: false,

                    message:
                        "Current password is incorrect."
                });
            }

            // Don't allow same password

            const samePassword =
                await bcrypt.compare(

                    newPassword,

                    user.password
                );

            if (samePassword) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New password must be different from current password."
                });
            }

            // Hash new password

            const hashedPassword =
                await bcrypt.hash(
                    newPassword,
                    10
                );

            // Update password

            await usersCollection.updateOne(

                {
                    _id:
                        new ObjectId(id)
                },

                {
                    $set: {

                        password:
                            hashedPassword,

                        updatedAt:
                            new Date()
                    }
                }
            );

            console.log(
                "Password changed successfully."
            );

            console.log(
                "================================"
            );

            res.json({

                success: true,

                message:
                    "Password changed successfully."
            });

        } catch (error) {

            console.error(
                "CHANGE USER PASSWORD ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to change password.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// ADMIN LOGIN
// ======================================================

app.post(
    "/api/admin/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;

            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and password are required."
                });
            }

            const cleanEmail =
                email
                    .toLowerCase()
                    .trim();

            const admin =
                await adminCollection.findOne({

                    email:
                        cleanEmail
                });

            if (!admin) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Wrong email or password."
                });
            }

            const passwordMatch =
                await bcrypt.compare(

                    password,

                    admin.password
                );

            if (!passwordMatch) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Wrong email or password."
                });
            }

            console.log(
                "Admin login successful:",
                cleanEmail
            );

            res.json({

                success: true,

                message:
                    "Admin login successful.",

                admin: {

                    id:
                        admin._id,

                    email:
                        admin.email
                }
            });

        } catch (error) {

            console.error(
                "ADMIN LOGIN ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Admin login failed.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// CHANGE ADMIN EMAIL / PASSWORD
// ======================================================

app.put(
    "/api/admin/change-credentials",
    async (req, res) => {

        try {

            const {
                currentEmail,
                currentPassword,
                newEmail,
                newPassword
            } = req.body;

            if (
                !currentEmail ||
                !currentPassword ||
                !newEmail ||
                !newPassword
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "All fields are required."
                });
            }

            const cleanCurrentEmail =
                currentEmail
                    .toLowerCase()
                    .trim();

            const cleanNewEmail =
                newEmail
                    .toLowerCase()
                    .trim();

            const admin =
                await adminCollection.findOne({

                    email:
                        cleanCurrentEmail
                });

            if (!admin) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Current email is incorrect."
                });
            }

            const passwordMatch =
                await bcrypt.compare(

                    currentPassword,

                    admin.password
                );

            if (!passwordMatch) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Current password is incorrect."
                });
            }

            const existingAdmin =
                await adminCollection.findOne({

                    email:
                        cleanNewEmail,

                    _id: {
                        $ne:
                            admin._id
                    }
                });

            if (existingAdmin) {

                return res.status(409).json({

                    success: false,

                    message:
                        "New email is already in use."
                });
            }

            const hashedPassword =
                await bcrypt.hash(
                    newPassword,
                    10
                );

            await adminCollection.updateOne(

                {
                    _id:
                        admin._id
                },

                {
                    $set: {

                        email:
                            cleanNewEmail,

                        password:
                            hashedPassword,

                        updatedAt:
                            new Date()
                    }
                }
            );

            res.json({

                success: true,

                message:
                    "Admin credentials changed successfully."
            });

        } catch (error) {

            console.error(
                "CHANGE ADMIN CREDENTIALS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to change admin credentials.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// CREATE PICKUP REQUEST
// ======================================================

app.post(
    "/api/pickup",
    upload.single("photo"),
    async (req, res) => {

        try {

            const {
                name,
                email,
                mobile,
                wasteType,
                weight,
                location,
                message
            } = req.body;

            console.log("");
            console.log("================================");
            console.log("NEW PICKUP REQUEST");
            console.log("================================");

            let photoName = null;

            if (req.file) {

                photoName =
                    req.file.filename;

                console.log(
                    "Photo:",
                    photoName
                );
            }

            const pickupRequest = {

                name:
                    name || "",

                email:
                    email
                        ? email.toLowerCase().trim()
                        : "",

                mobile:
                    mobile || "",

                wasteType:
                    wasteType || "",

                weight:
                    weight || "",

                location:
                    location || "",

                message:
                    message || "",

                photo:
                    photoName,

                status:
                    "Pending",

                createdAt:
                    new Date()
            };

            const result =
                await pickupCollection.insertOne(
                    pickupRequest
                );

            console.log(
                "Pickup saved:",
                result.insertedId
            );

            res.status(201).json({

                success: true,

                message:
                    "Pickup request submitted successfully!",

                id:
                    result.insertedId
            });

        } catch (error) {

            console.error(
                "PICKUP ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to save pickup request.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// GET ALL PICKUPS
// ======================================================

app.get(
    "/api/pickups",
    async (req, res) => {

        try {

            const pickups =
                await pickupCollection
                    .find({})
                    .sort({
                        createdAt: -1
                    })
                    .toArray();

            res.json({

                success: true,

                pickups:
                    pickups
            });

        } catch (error) {

            console.error(
                "GET PICKUPS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to fetch pickup requests.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// GET USER'S PICKUPS
// ======================================================

app.get(
    "/api/my-pickups",
    async (req, res) => {

        try {

            const email =
                req.query.email;

            if (!email) {

                return res.status(400).json({

                    success: false,

                    message:
                        "User email is required."
                });
            }

            const cleanEmail =
                email
                    .toLowerCase()
                    .trim();

            const pickups =
                await pickupCollection
                    .find({
                        email:
                            cleanEmail
                    })
                    .sort({
                        createdAt: -1
                    })
                    .toArray();

            res.json({

                success: true,

                pickups:
                    pickups
            });

        } catch (error) {

            console.error(
                "MY PICKUPS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load your pickup requests.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// GET SINGLE PICKUP
// ======================================================

app.get(
    "/api/pickups/:id",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            if (!ObjectId.isValid(id)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid pickup ID."
                });
            }

            const pickup =
                await pickupCollection.findOne({

                    _id:
                        new ObjectId(id)
                });

            if (!pickup) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Pickup request not found."
                });
            }

            res.json({

                success: true,

                pickup:
                    pickup
            });

        } catch (error) {

            console.error(
                "GET SINGLE PICKUP ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to get pickup request.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// UPDATE PICKUP STATUS
// ======================================================

app.put(
    "/api/pickups/:id/status",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            const {
                status
            } = req.body;

            const allowedStatuses = [

                "Pending",

                "Approved",

                "Rejected",

                "Pickup Assigned",

                "Out for Pickup",

                "Picked Up",

                "Completed"
            ];

            if (
                !allowedStatuses.includes(status)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid status."
                });
            }

            if (!ObjectId.isValid(id)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid pickup ID."
                });
            }

            const result =
                await pickupCollection.updateOne(

                    {
                        _id:
                            new ObjectId(id)
                    },

                    {
                        $set: {

                            status:
                                status,

                            updatedAt:
                                new Date()
                        }
                    }
                );

            if (
                result.matchedCount === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Pickup request not found."
                });
            }

            console.log(
                `Pickup ${id} status changed to ${status}`
            );

            res.json({

                success: true,

                message:
                    `Pickup status updated to ${status}.`
            });

        } catch (error) {

            console.error(
                "UPDATE STATUS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to update pickup status.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// DELETE PICKUP
// ======================================================

app.delete(
    "/api/pickups/:id",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            if (!ObjectId.isValid(id)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid pickup ID."
                });
            }

            const result =
                await pickupCollection.deleteOne({

                    _id:
                        new ObjectId(id)
                });

            if (
                result.deletedCount === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Pickup request not found."
                });
            }

            console.log(
                "Pickup deleted:",
                id
            );

            res.json({

                success: true,

                message:
                    "Pickup request deleted successfully."
            });

        } catch (error) {

            console.error(
                "DELETE PICKUP ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to delete pickup request.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// ADD COLLECTION POINT
// ======================================================

app.post(
    "/api/collection-points",
    async (req, res) => {

        try {

            const {
                name,
                address,
                wasteTypes,
                status
            } = req.body;

            if (
                !name ||
                !address ||
                !wasteTypes ||
                !status
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "All fields are required."
                });
            }

            const newPoint = {

                name:
                    name.trim(),

                address:
                    address.trim(),

                wasteTypes:
                    Array.isArray(wasteTypes)
                        ? wasteTypes
                        : [wasteTypes],

                status:
                    status,

                createdAt:
                    new Date()
            };

            const result =
                await collectionPointsCollection
                    .insertOne(newPoint);

            res.status(201).json({

                success: true,

                message:
                    "Collection point added successfully.",

                point: {

                    _id:
                        result.insertedId,

                    ...newPoint
                }
            });

        } catch (error) {

            console.error(
                "ADD COLLECTION POINT ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to add collection point.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// GET COLLECTION POINTS
// ======================================================

app.get(
    "/api/collection-points",
    async (req, res) => {

        try {

            const points =
                await collectionPointsCollection
                    .find({})
                    .sort({
                        createdAt: -1
                    })
                    .toArray();

            res.json({

                success: true,

                points:
                    points
            });

        } catch (error) {

            console.error(
                "GET COLLECTION POINTS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to load collection points.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// UPDATE COLLECTION POINT
// ======================================================

app.put(
    "/api/collection-points/:id",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            const {
                name,
                address,
                wasteTypes,
                status
            } = req.body;

            if (!ObjectId.isValid(id)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid collection point ID."
                });
            }

            const result =
                await collectionPointsCollection
                    .updateOne(

                        {
                            _id:
                                new ObjectId(id)
                        },

                        {
                            $set: {

                                name:
                                    name.trim(),

                                address:
                                    address.trim(),

                                wasteTypes:
                                    Array.isArray(
                                        wasteTypes
                                    )
                                        ? wasteTypes
                                        : [wasteTypes],

                                status:
                                    status,

                                updatedAt:
                                    new Date()
                            }
                        }
                    );

            if (
                result.matchedCount === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Collection point not found."
                });
            }

            res.json({

                success: true,

                message:
                    "Collection point updated successfully."
            });

        } catch (error) {

            console.error(
                "UPDATE COLLECTION POINT ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to update collection point.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// DELETE COLLECTION POINT
// ======================================================

app.delete(
    "/api/collection-points/:id",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            if (!ObjectId.isValid(id)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid collection point ID."
                });
            }

            const result =
                await collectionPointsCollection
                    .deleteOne({

                        _id:
                            new ObjectId(id)
                    });

            if (
                result.deletedCount === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Collection point not found."
                });
            }

            res.json({

                success: true,

                message:
                    "Collection point deleted successfully."
            });

        } catch (error) {

            console.error(
                "DELETE COLLECTION POINT ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to delete collection point.",

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// START SERVER
// ======================================================

async function startServer() {

    try {

        // Connect MongoDB

        await client.connect();

        console.log(
            "MongoDB connected successfully!"
        );

        // Database

        db =
            client.db("EcoCollect");

        // Collections

        usersCollection =
            db.collection("users");

        adminCollection =
            db.collection("admins");

        pickupCollection =
            db.collection("pickupRequests");

        collectionPointsCollection =
            db.collection("collectionPoints");

        console.log(
            "Database:",
            db.databaseName
        );

        console.log(
            "Collections initialized."
        );

        // ==================================================
        // CREATE FIRST ADMIN
        // ==================================================

        const adminCount =
            await adminCollection.countDocuments();

        if (adminCount === 0) {

            const adminEmail =
                (
                    process.env.ADMIN_EMAIL ||
                    "admin@ecocollect.com"
                )
                    .toLowerCase()
                    .trim();

            const adminPassword =
                process.env.ADMIN_PASSWORD ||
                "admin123";

            const hashedPassword =
                await bcrypt.hash(
                    adminPassword,
                    10
                );

            await adminCollection.insertOne({

                email:
                    adminEmail,

                password:
                    hashedPassword,

                createdAt:
                    new Date()
            });

            console.log(
                "================================"
            );

            console.log(
                "FIRST ADMIN ACCOUNT CREATED"
            );

            console.log(
                "Admin Email:",
                adminEmail
            );

            console.log(
                "================================"
            );

        } else {

            console.log(
                "Admin account already exists."
            );
        }

        // ==================================================
        // START EXPRESS
        // ==================================================

        app.listen(
            PORT,
            () => {

                console.log("");

                console.log(
                    "================================"
                );

                console.log(
                    `EcoCollect server running on http://localhost:${PORT}`
                );

                console.log(
                    "================================"
                );
            }
        );

    } catch (error) {

        console.error(
            "SERVER START ERROR:",
            error
        );

        process.exit(1);
    }
}

// ======================================================
// RUN SERVER
// ======================================================

startServer();
