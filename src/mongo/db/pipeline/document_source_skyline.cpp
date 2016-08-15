/**
 * Copyright (C) 2016 MongoDB Inc.
 *
 * This program is free software: you can redistribute it and/or  modify
 * it under the terms of the GNU Affero General Public License, version 3,
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * As a special exception, the copyright holders give permission to link the
 * code of portions of this program with the OpenSSL library under certain
 * conditions as described in each individual source file and distribute
 * linked combinations including the program with the OpenSSL library. You
 * must comply with the GNU Affero General Public License in all respects
 * for all of the code used other than as permitted herein. If you modify
 * file(s) with this exception, you may extend this exception to your
 * version of the file(s), but you are not obligated to do so. If you do not
 * wish to do so, delete this exception statement from your version. If you
 * delete this exception statement from all source files in the program,
 * then also delete it in the license file.
 */

#define MONGO_LOG_DEFAULT_COMPONENT ::mongo::logger::LogComponent::kDefault;

#include "mongo/platform/basic.h"

#include "document_source.h"

#include "mongo/util/log.h"

namespace mongo {
REGISTER_DOCUMENT_SOURCE_ALIAS(skyline, DocumentSourceSkyline::createFromBson);

std::vector<boost::intrusive_ptr<DocumentSource>> DocumentSourceSkyline::createFromBson(
    BSONElement specElem, const boost::intrusive_ptr<ExpressionContext>& pExpCtx) {
    std::vector<boost::intrusive_ptr<DocumentSource>> sources;
    sources.push_back(DocumentSourceSort::createFromBson(specElem, pExpCtx));
    sources.push_back(new DocumentSourceSkyline(pExpCtx));
    return sources;
}

boost::optional<Document> DocumentSourceSkyline::getNext() {
    while (true) {
        boost::optional<Document> doc = pSource->getNext();
        if (!doc) return boost::none;
        bool isDominated = false;
        for (const Document& skylinePoint : _skyline) {
            if (_dominates(skylinePoint, doc.get())) {
                isDominated = true;
                break;
            }
        }
        if (!isDominated) {
            _skyline.push_back(doc.get());
            return doc;
        }
    }
}

bool DocumentSourceSkyline::_dominates(const Document& doc1, const Document& doc2) {
    for (FieldIterator iter(doc1); iter.more();) {
        auto el = iter.next();
        StringData field = el.first;
        if (field == "_id")
            continue;
        Value value = el.second;
        if (Value::compare(value, doc2[field], nullptr) > 0) {
            // Cannot dominate.
            return false;
        }
    }
    return true;
}

Value DocumentSourceSkyline::serialize(bool explain) const {
    return Value(Document{{getSourceName(), Document()}});
}
}