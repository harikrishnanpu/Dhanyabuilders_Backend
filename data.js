import bcrypt from 'bcryptjs';

const data = {
  users: [
    {
      name: 'Hari',
      email: 'admin@db.com',
      isSuper: true,
      password: bcrypt.hashSync('1234', 8),
      isAdmin: true,
      isSupervisor: true,
      isSuper: true,
      isEmployee: true,
    },
  ],
  products: [
      {
        "name": "CEMENT SAC",
        "item_id": "K1",
        "category": "CEMENT",
        "image": "/image/",
        "price": null,
        "countInStock": null,
        "brand": "",
        "rating": 0,
        "numReviews": 0,
        "description": "high quality product",
        "pUnit": "BAG",
        "sUnit": "BAG",
        "psRatio": 1,
        "length": null,
        "countInStock": 0,
        "brand": 0,
        "breadth": null,
        "size": "",
        "unit": "FT",
        "actLength": 1,
        "actBreadth": 1,
        "type": "CEMENT",
        "seller": "BR CEMENT"
      }
    ]
};


export default data;
