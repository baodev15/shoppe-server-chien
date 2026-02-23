const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const teamController = require('../controllers/team.controller');

// User management routes
router.get('/accounts', adminController.getUsers);
router.get('/accounts/new', adminController.getUserForm);
router.get('/accounts/:id/edit', adminController.getEditUserForm);
router.post('/accounts', adminController.createUser);
router.put('/accounts/:id', adminController.updateUser);
router.delete('/accounts/:id', adminController.deleteUser);

// Team management routes
router.get('/teams', teamController.getTeams);
router.get('/teams/new', teamController.getTeamForm);
router.get('/teams/:id/edit', teamController.getEditTeamForm);
router.post('/teams', teamController.createTeam);
router.put('/teams/:id', teamController.updateTeam);
router.delete('/teams/:id', teamController.deleteTeam);

module.exports = router;