import commons from 'feathers-hooks-common';
import { restrictToOwner } from 'feathers-authentication-hooks';
import sanitizeAddress from '../../hooks/sanitizeAddress';
import setAddress from '../../hooks/setAddress';
import sanitizeHtml from '../../hooks/sanitizeHtml';

const restrict = [
  restrictToOwner({
    idField: 'address',
    ownerField: 'ownerAddress',
  }),
];

const schema = {
  include: [
    {
      service: 'users',
      nameAs: 'owner',
      parentField: 'ownerAddress',
      childField: 'address',
    },
  ]
};

const countCampaigns = (item, service) => {
  return service.find({
    query: {
      dacs: item._id,
      projectId: {
        $gt: '0' // 0 is a pending campaign
      },
      $limit: 0
    }
  }).then(count => Object.assign(item, { campaignsCount: count.total }));
};

// add campaignCount to each DAC object
const addCampaignCounts = () => (context) => {
  const service = context.app.service('campaigns');

  const items = commons.getItems(context);

  let promises;
  if (Array.isArray(items)) {
    promises = items.map(item => countCampaigns(item, service));
  } else {
    promises = [ countCampaigns(items, service) ];
  }

  return Promise.all(promises)
    .then(results => (Array.isArray(items)) ? commons.replaceItems(context, results) : commons.replaceItems(context, results[ 0 ]));
};

module.exports = {
  before: {
    all: [],
    find: [ sanitizeAddress('ownerAddress') ],
    get: [],
    create: [ setAddress('ownerAddress'), sanitizeAddress('ownerAddress', { required: true, validate: true, }), sanitizeHtml('description') ],
    update: [ ...restrict, sanitizeAddress('ownerAddress', { required: true, validate: true }), sanitizeHtml('description') ],
    patch: [ ...restrict, sanitizeAddress('ownerAddress', { validate: true }), sanitizeHtml('description') ],
    remove: [ sanitizeAddress('ownerAddress'), ...restrict ],
  },

  after: {
    all: [ commons.populate({ schema })],
    find: [ addCampaignCounts() ],
    get: [ addCampaignCounts()],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },
};
