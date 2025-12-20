/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User login
 *     description: Authenticate user and return JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: User's username
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/admin/classes:
 *   get:
 *     tags:
 *       - Classes
 *     summary: Get all classes
 *     description: Retrieve list of all classes (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of classes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Class'
 *       401:
 *         description: Unauthorized
 *   post:
 *     tags:
 *       - Classes
 *     summary: Create new class
 *     description: Create a new class (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - teacherId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Class name
 *               code:
 *                 type: string
 *                 description: Class code
 *               teacherId:
 *                 type: string
 *                 description: Teacher ID
 *               department:
 *                 type: string
 *                 description: Department
 *               description:
 *                 type: string
 *                 description: Class description
 *     responses:
 *       201:
 *         description: Class created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/teacher/assignments:
 *   post:
 *     tags:
 *       - Assignments
 *     summary: Create assignment
 *     description: Create a new assignment for a class (Teacher only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - classId
 *               - title
 *               - dueDate
 *             properties:
 *               classId:
 *                 type: string
 *                 description: Class ID
 *               title:
 *                 type: string
 *                 description: Assignment title
 *               description:
 *                 type: string
 *                 description: Assignment description
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Due date
 *               isExam:
 *                 type: boolean
 *                 description: Whether this is an exam
 *               durationMinutes:
 *                 type: integer
 *                 description: Duration in minutes (for exams)
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
