import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from 'recharts';
import {
    Plus,
    Upload,
    ListChecks,
    Banknote,
    CreditCard,
    Calculator,
    TrendingUp,
    TrendingDown,
    File,
    File as FileIcon, // Changed to File
    FileJson,
    FileText,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

// Mock Data & Types
// --------------------

interface Transaction {
    id: string;
    date: string;
    description: string;
    category: string;
    amount: number;
    account: string; // Added account
}

interface Account {
    id: string;
    name: string;
    type: 'checking' | 'savings' | 'credit';
    balance: number;
}

const CATEGORIES = [
    'Food & Dining',
    'Housing',
    'Transportation',
    'Utilities',
    'Shopping',
    'Income',
    'Entertainment',
    'Other',
    'Subscriptions',
    'Travel',
    'Education',
    'Healthcare',
];

const ACCOUNT_TYPES = [
    { value: 'checking', label: 'Checking Account', icon: <Banknote className="mr-2 h-4 w-4" /> },
    { value: 'savings', label: 'Savings Account', icon: <ListChecks className="mr-2 h-4 w-4" /> },
    { value: 'credit', label: 'Credit Card', icon: <CreditCard className="mr-2 h-4 w-4" /> },
];

// Helper Functions
// --------------------
const parseCSV = (text: string): Omit<Transaction, 'id' | 'category' | 'account'>[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
            obj[header] = values[index];
        });
        // Basic validation and handling of missing fields
        const date = obj.Date || '';
        const description = obj.Description || '';
        const amount = parseFloat(obj.Amount || '0');
        return { date, description, amount };
    });
    return data;
};

const parseYNAB = (text: string): Omit<Transaction, 'id' | 'category' | 'account'>[] => {
    try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
            console.error("Data is not an array:", data);
            return [];
        }

        return data.map((item: any) => {
            // Check for null or undefined and provide default values
            const date = item.Date || '';
            const description = item.Description || '';
            const amount = parseFloat(item.Amount || '0');  // Ensure Amount is a number
            return { date, description, amount };
        });
    } catch (error) {
        console.error("Error parsing YNAB data:", error);
        return [];
    }
};

// Basic categorization rules (can be expanded)
const categorizeTransaction = (description: string): string => {
    const lowerCaseDescription = description.toLowerCase();
    if (lowerCaseDescription.includes('grocery')) return 'Food & Dining';
    if (lowerCaseDescription.includes('restaurant')) return 'Food & Dining';
    if (lowerCaseDescription.includes('rent')) return 'Housing';
    if (lowerCaseDescription.includes('mortgage')) return 'Housing';
    if (lowerCaseDescription.includes('fuel') || lowerCaseDescription.includes('gas')) return 'Transportation';
    if (lowerCaseDescription.includes('electricity') || lowerCaseDescription.includes('water')) return 'Utilities';
    if (lowerCaseDescription.includes('amazon') || lowerCaseDescription.includes('ebay')) return 'Shopping';
    if (lowerCaseDescription.includes('salary') || lowerCaseDescription.includes('paycheck')) return 'Income';
    if (lowerCaseDescription.includes('netflix') || lowerCaseDescription.includes('hulu')) return 'Entertainment';
    return 'Other';
};

const getCategoryColor = (category: string) => {
    const categoryColors: Record<string, string> = {
        'Food & Dining': '#FF6B6B',
        'Housing': '#FFD966',
        'Transportation': '#4ECDC4',
        'Utilities': '#849324',
        'Shopping': '#FF6B6B',
        'Income': '#00A896',
        'Entertainment': '#9B5DE5',
        'Other': '#F15BB5',
        'Subscriptions': '#3282B8',
        'Travel': '#F72585',
        'Education': '#43AA8B',
        'Healthcare': '#90BE6D',
    };
    return categoryColors[category] || '#808080'; // Default gray
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

// React Components
// --------------------

// Transaction Input Sheet
const TransactionInputSheet = ({
    onAddTransaction,
    accounts
}: {
    onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    accounts: Account[];
}) => {
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [account, setAccount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAdd = async () => {
        setIsSubmitting(true);
        setError(null);

        // Basic validation
        if (!date || !description || !amount || !category || !account) {
            setError('Please fill in all fields.');
            setIsSubmitting(false);
            return;
        }

        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount)) {
            setError('Invalid amount. Please enter a number.');
            setIsSubmitting(false);
            return;
        }

        try {
            const newTransaction: Omit<Transaction, 'id'> = {
                date,
                description,
                amount: parsedAmount,
                category,
                account,
            };
            onAddTransaction(newTransaction);
            // Clear form
            setDate('');
            setDescription('');
            setAmount('');
            setCategory('');
            setAccount('');
        } catch (err: any) {
            setError(err.message || 'Failed to add transaction.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add Transaction
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Add New Transaction</SheetTitle>
                    <SheetDescription>
                        Enter the details of your transaction below.
                    </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label htmlFor="date" className="text-sm font-medium block">Date</label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            placeholder="YYYY-MM-DD"
                            required
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium block">Description</label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter transaction description"
                            required
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="amount" className="text-sm font-medium block">Amount</label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.valueAsNumber)}
                            placeholder="Enter amount"
                            required
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="category" className="text-sm font-medium block">Category</label>
                        <Select onValueChange={setCategory} value={category}>
                            <SelectTrigger id="category" className="w-full">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="account" className="text-sm font-medium block">Account</label>
                        <Select onValueChange={setAccount} value={account}>
                            <SelectTrigger id="account" className="w-full">
                                <SelectValue placeholder="Select an account" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.name} ({acc.type})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
                <div className="flex justify-end">
                    <Button
                        onClick={handleAdd}
                        disabled={isSubmitting}
                        className="w-full"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            'Add Transaction'
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// Transaction Import Component
const TransactionImport = ({ onImportTransactions, accounts }: { onImportTransactions: (transactions: Omit<Transaction, 'id'>[], accountId: string) => void, accounts: Account[] }) => {
    const [file, setFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<'csv' | 'ynab' | 'text'>('csv');  // Added file type
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<string>('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        setIsImporting(true);
        setError(null);

        if (!file) {
            setError('Please select a file to import.');
            setIsImporting(false);
            return;
        }

        if (!selectedAccount) {
            setError('Please select an account to import into.');
            setIsImporting(false);
            return;
        }

        const reader = new FileReader();

        reader.onload = async (e) => {
            if (e.target && typeof e.target.result === 'string') {
                try {
                    let parsedTransactions: Omit<Transaction, 'id'>[] = [];
                    switch (fileType) {
                        case 'csv':
                            parsedTransactions = parseCSV(e.target.result);
                            break;
                        case 'ynab':
                            parsedTransactions = parseYNAB(e.target.result);
                            break;
                        case 'text':
                            parsedTransactions = parseCSV(e.target.result); //for .txt files
                            break;
                        default:
                            setError('Unsupported file type.');
                            setIsImporting(false);
                            return;
                    }

                    // Add basic validation for date and amount during import
                    const validatedTransactions = parsedTransactions.filter(transaction => {
                        if (!transaction.date) {
                            console.warn('Skipping transaction with missing date:', transaction);
                            return false;
                        }
                        if (isNaN(transaction.amount)) {
                            console.warn('Skipping transaction with invalid amount:', transaction);
                            return false;
                        }
                        return true; // Keep the transaction if it passes validation
                    });

                    onImportTransactions(validatedTransactions, selectedAccount);
                } catch (err: any) {
                    setError(`Error parsing file: ${err.message || 'Unknown error'}`);
                } finally {
                    setIsImporting(false);
                }
            }
        };

        reader.onerror = () => {
            setError('Failed to read file.');
            setIsImporting(false);
        };

        if (fileType === 'csv' || fileType === 'text') {
            reader.readAsText(file);
        } else if (fileType === 'ynab') {
            reader.readAsText(file);
        } else {
            setError('Unsupported file type.');
            setIsImporting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Import Transactions</CardTitle>
                <CardDescription>Import transactions from a file.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="file" className="text-sm font-medium block">
                        File
                    </label>
                    <Input
                        id="file"
                        type="file"
                        onChange={handleFileChange}
                        disabled={isImporting}
                        className="w-full"
                        accept=".csv,.json,.txt" // Specify accepted file types
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="file-type" className="text-sm font-medium block">File Type</label>
                    <Select onValueChange={(value) => setFileType(value as 'csv' | 'ynab' | 'text')} value={fileType}>
                        <SelectTrigger id="file-type" className="w-full">
                            <SelectValue placeholder="Select file type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="csv">
                                <div className="flex items-center">
                                    <FileIcon className="mr-2 h-4 w-4" /> CSV (.csv)
                                </div>
                            </SelectItem>
                            <SelectItem value="ynab">
                                <div className="flex items-center">
                                    <FileJson className="mr-2 h-4 w-4" /> YNAB (.json)
                                </div>
                            </SelectItem>
                            <SelectItem value="text">
                                <div className="flex items-center">
                                    <FileText className="mr-2 h-4 w-4" /> Text (.txt)
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label htmlFor="account" className="text-sm font-medium block">Account</label>
                    <Select onValueChange={setSelectedAccount} value={selectedAccount}>
                        <SelectTrigger id="account" className="w-full">
                            <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                    {account.name} ({account.type})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button
                    onClick={handleImport}
                    disabled={isImporting || !file}
                    className="w-full"
                >
                    {isImporting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Importing...
                        </>
                    ) : (
                        <><Upload className="mr-2 h-4 w-4" /> Import</>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};

// Transaction List Component
const TransactionList = ({
    transactions,
    onDeleteTransaction,
    onUpdateTransaction,
    accounts
}: {
    transactions: Transaction[];
    onDeleteTransaction: (id: string) => void;
    onUpdateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => void;
    accounts: Account[];
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editedTransaction, setEditedTransaction] = useState<Partial<Omit<Transaction, 'id'>>>({});

    const startEditing = (transaction: Transaction) => {
        setEditingId(transaction.id);
        setEditedTransaction({
            date: transaction.date,
            description: transaction.description,
            amount: transaction.amount,
            category: transaction.category,
            account: transaction.account,
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditedTransaction({});
    };

    const saveChanges = (id: string) => {
        onUpdateTransaction(id, editedTransaction);
        setEditingId(null);
        setEditedTransaction({});
    };

    const getAccountName = (accountId: string) => {
        const account = accounts.find(acc => acc.id === accountId);
        return account ? account.name : 'Unknown Account';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>
                    List of your recent transactions. Click a row to edit.
                </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                {transactions.length === 0 ? (
                    <div className="text-center py-4">No transactions recorded yet.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Account</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence>
                                {transactions.map((transaction) => (
                                    <motion.tr
                                        key={transaction.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {editingId === transaction.id ? (
                                            <>
                                                <TableCell>
                                                    <Input
                                                        type="date"
                                                        value={editedTransaction.date || ''}
                                                        onChange={(e) =>
                                                            setEditedTransaction({
                                                                ...editedTransaction,
                                                                date: e.target.value,
                                                            })
                                                        }
                                                        className="w-full"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Textarea
                                                        value={editedTransaction.description || ''}
                                                        onChange={(e) =>
                                                            setEditedTransaction({
                                                                ...editedTransaction,
                                                                description: e.target.value,
                                                            })
                                                        }
                                                        className="w-full"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={
                                                            editedTransaction.amount !== undefined
                                                                ? editedTransaction.amount
                                                                : ''
                                                        }
                                                        onChange={(e) =>
                                                            setEditedTransaction({
                                                                ...editedTransaction,
                                                                amount: e.target.valueAsNumber,
                                                            })
                                                        }
                                                        className="w-full"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        onValueChange={(value) =>
                                                            setEditedTransaction({
                                                                ...editedTransaction,
                                                                category: value,
                                                            })
                                                        }
                                                        value={editedTransaction.category || ''}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {CATEGORIES.map((cat) => (
                                                                <SelectItem key={cat} value={cat}>
                                                                    {cat}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        onValueChange={(value) =>
                                                            setEditedTransaction({
                                                                ...editedTransaction,
                                                                account: value,
                                                            })
                                                        }
                                                        value={editedTransaction.account || ''}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {accounts.map((acc) => (
                                                                <SelectItem key={acc.id} value={acc.id}>
                                                                    {acc.name} ({acc.type})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => saveChanges(transaction.id)}
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={cancelEditing}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </>
                                        ) : (
                                            <TableRow
                                                onClick={() => startEditing(transaction)}
                                                className="cursor-pointer hover:bg-gray-100"
                                            >
                                                <TableCell>{transaction.date}</TableCell>
                                                <TableCell>{transaction.description}</TableCell>
                                                <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                                                <TableCell>{transaction.category}</TableCell>
                                                <TableCell>{getAccountName(transaction.account)}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent row click when deleting
                                                            onDeleteTransaction(transaction.id);
                                                        }}
                                                        className="ml-auto"
                                                    >
                                                        Delete
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};

// Dashboard Component
const Dashboard = ({ transactions, accounts }: { transactions: Transaction[], accounts: Account[] }) => {
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const filteredTransactions = transactions.filter((t) => {
        const transactionDate = new Date(t.date);
        return (
            transactionDate.getMonth() === selectedMonth &&
            transactionDate.getFullYear() === selectedYear
        );
    });

    const income = filteredTransactions
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions
.filter((t) => t.amount< 0)
        .reduce((sum, t) => sum + t.amount, 0);
    const netBalance = income + expenses;

    // Data for charts
    const categoryTotals = filteredTransactions.reduce((acc: Record<string, number>, t) => {
        const category = t.category;
        acc[category] = (acc[category] || 0) + (t.amount < 0 ? Math.abs(t.amount) : 0);
        return acc;
    }, {});

    const chartData = Object.entries(categoryTotals).map(([category, total]) => ({
        category,
        total,
        color: getCategoryColor(category),
    }));

    const monthlyIncome = filteredTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = filteredTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const accountBalances = accounts.reduce((acc: Record<string, number>, account) => {
        acc[account.name] = account.balance;
        return acc;
    }, {});

    const balanceChartData = Object.entries(accountBalances).map(([accountName, balance]) => ({
        account: accountName,
        balance,
    }));

    const allMonths = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(selectedYear, i);
        return {
            value: i,
            label: date.toLocaleString('default', { month: 'long' }),
        };
    });

    const uniqueYears = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Dashboard</CardTitle>
                    <CardDescription>
                        Overview of your finances for {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <label htmlFor="month" className="text-sm font-medium">Month:</label>
                            <Select
                                onValueChange={(value) => setSelectedMonth(Number(value))}
                                value={selectedMonth.toString()}
                            >
                                <SelectTrigger id="month" className="w-[180px]">
                                    <SelectValue placeholder="Select a month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allMonths.map((month) => (
                                        <SelectItem key={month.value} value={month.value.toString()}>
                                            {month.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="year" className="text-sm font-medium">Year:</label>
                            <Select
                                onValueChange={(value) => setSelectedYear(Number(value))}
                                value={selectedYear.toString()}
                            >
                                <SelectTrigger id="year" className="w-[180px]">
                                    <SelectValue placeholder="Select a year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {uniqueYears.map((year) => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Card className="bg-green-100 border-green-300 text-green-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" /> Income
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{formatCurrency(monthlyIncome)}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-red-100 border-red-300 text-red-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingDown className="h-5 w-5" /> Expenses
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{formatCurrency(monthlyExpenses)}</p>
                            </CardContent>
                        </Card>
                        <Card className={cn(
                            "text-white",
                            netBalance >= 0 ? "bg-blue-500 border-blue-700" : "bg-red-500 border-red-700"
                        )}>
                            <CardHeader>
                                <CardTitle>Net Balance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{formatCurrency(netBalance)}</p>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            {/* Account Balances Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Balances</CardTitle>
                    <CardDescription>Current balances across your accounts</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={balanceChartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="account" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="balance" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Expense Breakdown Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Expense Breakdown</CardTitle>
                    <CardDescription>Spending by category</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="total"
                                label={({
                                    cx,
                                    cy,
                                    midAngle,
                                    innerRadius,
                                    outerRadius,
                                    value,
                                    index
                                }: any) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = 25 + innerRadius + (outerRadius - innerRadius);
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                    return (
                                        <text
                                            x={x}
                                            y={y}
                                            fill={getCategoryColor(chartData[index].category)}
                                            textAnchor={x > cx ? 'start' : 'end'}
                                            dominantBaseline="central"
                                        >
                                            {chartData[index].category} ({formatCurrency(value)})
                                        </text>
                                    );
                                }}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

// Main App Component
const PersonalFinanceApp = () => {
    const [transactions, setTransactions] = useState<Transaction[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('transactions');
            try {
                return saved ? JSON.parse(saved) : [];
            } catch (error) {
                console.error('Error parsing saved transactions:', error);
                return [];
            }
        }
        return [];
    });

    const [accounts, setAccounts] = useState<Account[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('accounts');
            try {
                return saved ? JSON.parse(saved) : [
                    { id: 'checking1', name: 'Checking Account 1', type: 'checking', balance: 1234.56 },
                    { id: 'savings1', name: 'Savings Account 1', type: 'savings', balance: 5678.90 },
                    { id: 'credit1', name: 'Credit Card 1', type: 'credit', balance: -500.00 },
                ];
            } catch (error) {
                console.error('Error parsing saved accounts:', error);
                return [
                    { id: 'checking1', name: 'Checking Account 1', type: 'checking', balance: 1234.56 },
                    { id: 'savings1', name: 'Savings Account 1', type: 'savings', balance: 5678.90 },
                    { id: 'credit1', name: 'Credit Card 1', type: 'credit', balance: -500.00 },
                ];
            }
        }
        return [
            { id: 'checking1', name: 'Checking Account 1', type: 'checking', balance: 1234.56 },
            { id: 'savings1', name: 'Savings Account 1', type: 'savings', balance: 5678.90 },
            { id: 'credit1', name: 'Credit Card 1', type: 'credit', balance: -500.00 },
        ];
    });

    // Persist state to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('transactions', JSON.stringify(transactions));
            localStorage.setItem('accounts', JSON.stringify(accounts));
        }
    }, [transactions, accounts]);

    const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            ...transaction,
        };
        setTransactions((prevTransactions) => [...prevTransactions, newTransaction]);

        // Update Account Balance
        setAccounts(prevAccounts => {
            return prevAccounts.map(account => {
                if (account.id === newTransaction.account) {
                    return {
                        ...account,
                        balance: account.balance + newTransaction.amount
                    };
                }
                return account;
            });
        });
    }, []);

    const importTransactions = useCallback((newTransactions: Omit<Transaction, 'id'>[], accountId: string) => {
        const transactionsWithIds = newTransactions.map(t => ({
            id: crypto.randomUUID(),
            ...t,
            category: categorizeTransaction(t.description),
            account: accountId, // Set the account ID
        }));

        setTransactions(prevTransactions => [...prevTransactions, ...transactionsWithIds]);

        // Update Account Balance
        setAccounts(prevAccounts => {
            return prevAccounts.map(account => {
                if (account.id === accountId) {
                    const totalAmount = newTransactions.reduce((sum, t) => sum + t.amount, 0);
                    return {
                        ...account,
                        balance: account.balance + totalAmount
                    };
                }
                return account;
            });
        });
    }, []);

    const deleteTransaction = useCallback((id: string) => {
        const transactionToDelete = transactions.find(t => t.id === id);
        if (!transactionToDelete) return; // Exit if transaction not found

        setTransactions((prevTransactions) =>
            prevTransactions.filter((transaction) => transaction.id !== id)
        );

        // Update Account Balance
        setAccounts(prevAccounts => {
            return prevAccounts.map(account => {
                if (account.id === transactionToDelete.account) {
                    return {
                        ...account,
                        balance: account.balance - transactionToDelete.amount
                    };
                }
                return account;
            });
        });
    }, [transactions]);

    const updateTransaction = useCallback((id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
        setTransactions(prevTransactions => {
            return prevTransactions.map(transaction => {
                if (transaction.id === id) {
                    // Store the original amount and account ID *before* applying updates
                    const originalAmount = transaction.amount;
                    const originalAccountId = transaction.account;

                    // Apply the updates
                    const updatedTransaction = { ...transaction, ...updates };

                    // *Calculate* the amount difference.  Handle the case where amount is undefined.
                    const newAmount = updates.amount !== undefined ? updates.amount : transaction.amount;
                    const amountDifference = newAmount - originalAmount;

                    // Determine the *new* account ID.  Handle the case where account is undefined.
                    const newAccountId = updates.account || originalAccountId;

                    // Return the updated transaction
                    return updatedTransaction;
                }
                return transaction;
            });
        });

        // Update Account Balances
        setAccounts(prevAccounts => {
            return prevAccounts.map(account => {
                // Find the *original* transaction
                const originalTransaction = transactions.find(t => t.id === id);
                if (!originalTransaction) return account;

                const updatedTransaction = transactions.find(t => t.id === id);

                // If this is the *original* account
                if (account.id === originalTransaction.account) {
                    let amountDifference = 0;
                    if (updatedTransaction) {
                        amountDifference = updatedTransaction.amount - originalTransaction.amount;
                    }
                    return {
                        ...account,
                        balance: account.balance + amountDifference,
                    };
                }
                // If this is the *new* account
                if (updatedTransaction && account.id === updatedTransaction.account) {
                    return {
                        ...account,
                        balance: account.balance + (updatedTransaction.amount - originalTransaction.amount),
                    };
                }
                return account;
            });
        });
    }, [transactions]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">Personal Finance Tracker</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3">
                    <Dashboard transactions={transactions} accounts={accounts} />
                    <div className="mt-8 space-y-4">
                        <TransactionList
                            transactions={transactions}
                            onDeleteTransaction={deleteTransaction}
                            onUpdateTransaction={updateTransaction}
                            accounts={accounts}
                        />
                        <div className="flex flex-col sm:flex-row gap-4">
                            <TransactionInputSheet onAddTransaction={addTransaction} accounts={accounts} />
                            <TransactionImport onImportTransactions={importTransactions} accounts={accounts} />
                        </div>
                    </div>
                </div>
                <div className="md:col-span-1">
                </div>
            </div>
        </div>
    );
};

export default PersonalFinanceApp;

