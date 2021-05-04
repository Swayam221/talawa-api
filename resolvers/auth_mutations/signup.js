const Organization = require('../../models/Organization');
const jwt = require("jsonwebtoken");
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const {
  createAccessToken,
  createRefreshToken,
} = require('../../helper_functions/auth');

const uploadImage = require('../../helper_functions/uploadImage');

const nodemailer=require("nodemailer");
const transporter = nodemailer.createTransport({      
  host: "smtp.gmail.com",
  secure:true,
  auth: {
    type: "OAuth2",
    user: "guptaswayam085@gmail.com",
    clientId: "308715584675-jtii2n3sra408mooi0hj641hkctm2lss.apps.googleusercontent.com",
    clientSecret: "LjHlkNT7H_y960bU3Oe771wt",
    refreshToken: "1//04a5eCRsgyy3oCgYIARAAGAQSNwF-L9IrG7IENWywbLu5qxwmPmJoGY3GaBabCesvvvMyN67CIaTVjXP658m8qTDcuDTJgX6uTzQ"                              
  },
  from:"guptaswayam085@gmail.com"
});

var E_SECRET=process.env.EMAIL_SECRET;


module.exports = async (parent, args) => {
  const emailTaken = await User.findOne({
    email: args.data.email.toLowerCase(),
  });
  if (emailTaken) {
    throw new Error('Email address taken.');
  }

  // TODO: this check is to be removed
  let org;
  if (args.data.organizationUserBelongsToId) {
    org = await Organization.findOne({
      _id: args.data.organizationUserBelongsToId,
    });
    if (!org) throw new Error('Organization not found');
  }

  const hashedPassword = await bcrypt.hash(args.data.password, 12);

  // Upload file
  let uploadImageObj;
  if (args.file) {
    uploadImageObj = await uploadImage(args.file, null);
  }

  let user = new User({
    ...args.data,
    organizationUserBelongsTo: org ? org : null,
    email: args.data.email.toLowerCase(), // ensure all emails are stored as lowercase to prevent duplicated due to comparison errors
    image: uploadImageObj
      ? uploadImageObj.imageAlreadyInDbPath
        ? uploadImageObj.imageAlreadyInDbPath
        : uploadImageObj.newImagePath
      : null,
    password: hashedPassword,
    confirmed: false
  });

  // async email
  try {
    console.log("hello");
      const emailToken = jwt.sign(
        {
          user: args.data.email,
        },
        E_SECRET,
        {
          expiresIn: '1d',
        },
      );

      const url = `http://localhost:4000/confirmation/${emailToken}`;
        console.log("hello1");
      await transporter.sendMail({
        from:"guptaswayam085@gmail.com",
        to: args.data.email,
        subject: 'Confirm Email',
        //html: `Please click this email to confirm your email: <a href="${url}">${url}</a>`,
        text: `Please click this email to confirm your email: ${url}`
      });

      console.log("hello3");
  } catch (e) {
    console.log(e);
  }
    
  user = await user.save();
  const accessToken = await createAccessToken(user);
  const refreshToken = await createRefreshToken(user);
  console.log(user);
  return {
    user: {
      ...user._doc,
      password: null,
    },
    accessToken,
    refreshToken,
  };
};
