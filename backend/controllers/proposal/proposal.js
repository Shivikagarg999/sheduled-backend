const Proposal = require('../../models/propoosals');

exports.createProposal = async (req, res) => {
  try {
    const { name, email, description, timeline, budget } = req.body;

    if (!name || !email || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and description are required'
      });
    }

    const proposal = new Proposal({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      description: description.trim(),
      timeline: timeline || 'flexible',
      budget: budget || 'To be discussed'
    });

    await proposal.save();

    res.status(201).json({
      success: true,
      message: 'Proposal submitted successfully',
      data: proposal
    });

  } catch (error) {
    console.error('Create proposal error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create proposal'
    });
  }
};

// Get all proposals
exports.getAllProposals = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      timeline,
      budget,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = req.query;

    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (timeline && timeline !== 'all') {
      query.timeline = timeline;
    }
    
    if (budget && budget !== 'all') {
      query.budget = budget;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const proposals = await Proposal.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Proposal.countDocuments(query);

    res.status(200).json({
      success: true,
      data: proposals,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch proposals'
    });
  }
};

// Get single proposal by ID
exports.getProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    res.status(200).json({
      success: true,
      data: proposal
    });

  } catch (error) {
    console.error('Get proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch proposal'
    });
  }
};

// Update proposal
exports.updateProposal = async (req, res) => {
  try {
    const { name, email, description, timeline, budget, status } = req.body;

    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    if (name) proposal.name = name.trim();
    if (email) proposal.email = email.toLowerCase().trim();
    if (description) proposal.description = description.trim();
    if (timeline) proposal.timeline = timeline;
    if (budget) proposal.budget = budget;
    if (status) proposal.status = status;

    await proposal.save();

    res.status(200).json({
      success: true,
      message: 'Proposal updated successfully',
      data: proposal
    });

  } catch (error) {
    console.error('Update proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update proposal'
    });
  }
};

// Delete proposal
exports.deleteProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findByIdAndDelete(req.params.id);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Proposal deleted successfully'
    });

  } catch (error) {
    console.error('Delete proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete proposal'
    });
  }
};

// Get proposal statistics
exports.getProposalStats = async (req, res) => {
  try {
    const total = await Proposal.countDocuments();
    const pending = await Proposal.countDocuments({ status: 'pending' });
    const reviewed = await Proposal.countDocuments({ status: 'reviewed' });
    const contacted = await Proposal.countDocuments({ status: 'contacted' });
    const accepted = await Proposal.countDocuments({ status: 'accepted' });
    const rejected = await Proposal.countDocuments({ status: 'rejected' });

    const timelineStats = await Proposal.aggregate([
      {
        $group: {
          _id: '$timeline',
          count: { $sum: 1 }
        }
      }
    ]);

    const budgetStats = await Proposal.aggregate([
      {
        $group: {
          _id: '$budget',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus: {
          pending,
          reviewed,
          contacted,
          accepted,
          rejected
        },
        timelineStats,
        budgetStats
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};