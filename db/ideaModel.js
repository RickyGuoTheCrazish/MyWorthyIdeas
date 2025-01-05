// /db/ideaModel.js
const { mongoose } = require("./connection");

// For example, the custom validator approach
const VALID_MAIN_CATEGORIES = [
    "Technology",
    "Games",
    "Business",
    "Life",
    "Arts & Design",
    "Science",
    "Health & Wellness",
    "Other"
];

const SUBCATS_BY_MAIN = {
    "Technology": ["Computer", "Assembly", "Electrical Engineering", "Artificial Intelligence", "Software Development", "Networking & Security", "Other"],
    "Games": ["Video Games", "Board & Card Games", "RPGs", "Mobile Games", "eSports", "Other"],
    "Business": ["Startups & Entrepreneurship", "Marketing & Sales", "eCommerce", "Management & Leadership", "Finance & Investing", "Other"],
    "Life": ["Personal Development", "Relationships & Family", "Travel & Leisure", "Hobbies & DIY", "Culture & Society", "Other"],
    "Arts & Design": ["Painting & Drawing", "Graphic Design & Illustration", "Photography & Film", "Architecture & Interior Design", "Fashion & Textiles", "Other"],
    "Science": ["Biology & Ecology", "Chemistry & Materials", "Physics & Astronomy", "Earth Science & Geology", "Research Methods & Academia", "Other"],
    "Health & Wellness": ["Fitness & Exercise", "Nutrition & Diet", "Mental Health", "Holistic & Alternative", "Medical & Anatomy", "Other"],
    "Other": ["Other"]
};

const ideaSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        preview: { type: String, required: true, trim: true },
        contentRaw: { type: mongoose.Schema.Types.Mixed, default: {} },
        contentHtml: { type: String, default: "" },
        priceAUD: { type: Number, required: true, min: 0, description: 'Price in AUD' },
        creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        isSold: { type: Boolean, default: false },
        buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        boughtAt: { type: Date, default: null },
        thumbnailImage: { type: String, default: "" },
        contentImages: [{ type: String }],
        rating: { type: Number, min: 0, max: 5, default: null },
        comment: {
            type: String,
            default: ""
        },
        purchasedBy: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            purchaseDate: {
                type: Date,
                default: Date.now
            },
            amountPaid: {
                type: Number,
                required: true
            },
            transactionId: {
                type: String,
                required: true
            }
        }],
        categories: [{
            main: {
                type: String,
                enum: VALID_MAIN_CATEGORIES,
                required: true
            },
            sub: {
                type: String,
                required: true,
                validate: {
                    validator: function(value) {
                        const mainCategory = this.main;
                        return SUBCATS_BY_MAIN[mainCategory]?.includes(value);
                    },
                    message: props => 
                        `'${props.value}' is not a valid subcategory for main category '${props.parent.main}'.`
                }
            }
        }],
        stripePaymentIntentId: String,
        stripeTransferId: String,
        paymentStatus: {
            type: String,
            enum: ['pending', 'completed', 'failed'],
            default: 'pending'
        }
    },
    { 
        timestamps: true, 
        toJSON: { virtuals: true }, 
        toObject: { virtuals: true } 
    }
);

// Index for faster searches
ideaSchema.index({ title: 'text', preview: 'text' });
ideaSchema.index({ creator: 1 });
ideaSchema.index({ buyer: 1 });
ideaSchema.index({ categories: 1 });
ideaSchema.index({ isSold: 1 });
ideaSchema.index({ rating: -1 });
ideaSchema.index({ createdAt: -1 });

ideaSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const IdeaModel = mongoose.model("Idea", ideaSchema);
module.exports = IdeaModel;
