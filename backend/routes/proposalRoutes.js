const express = require('express');
const router = express.Router();
const {
  createProposal,
  getAllProposals,
  getProposal,
  updateProposal,
  deleteProposal,
  getProposalStats
} = require('../controllers/proposal/proposal');

router.post('/', createProposal);
router.get('/', getAllProposals);
router.get('/stats', getProposalStats);
router.get('/:id', getProposal);
router.put('/:id', updateProposal);
router.delete('/:id', deleteProposal);

module.exports = router;